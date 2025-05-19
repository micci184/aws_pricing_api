const fetch = require("node-fetch");

const pricingUrls = {
  ec2: "https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AmazonEC2/current/ap-northeast-1/index.json",
  fargate:
    "https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AWSFargate/current/ap-northeast-1/index.json",
  documentdb:
    "https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AmazonDocDB/current/ap-northeast-1/index.json",
};

const allowedInstanceTypes = ["m6i.", "m6g.", "t4g.", "c6i.", "r6i."];

module.exports = async (req, res) => {
  const { service } = req.query;

  if (!service || !pricingUrls[service]) {
    return res
      .status(400)
      .json({ error: "Invalid or missing service parameter" });
  }

  try {
    const response = await fetch(pricingUrls[service]);
    const data = await response.json();

    const filteredProducts = {};
    const terms = data.terms.OnDemand;

    for (let sku in data.products) {
      const product = data.products[sku];

      // EC2のみインスタンスタイプでフィルタリング（他のサービスはフィルタなし）
      if (service === "ec2") {
        if (
          !(
            product.attributes &&
            allowedInstanceTypes.some(
              (type) =>
                product.attributes.instanceType &&
                product.attributes.instanceType.startsWith(type)
            ) &&
            product.attributes.operatingSystem === "Linux" &&
            product.attributes.tenancy === "Shared"
          )
        ) {
          continue;
        }
      }

      const priceData = terms[sku];
      if (!priceData) continue;

      const priceDimensions = Object.values(priceData)[0].priceDimensions;
      const price = priceDimensions
        ? Object.values(priceDimensions)[0].pricePerUnit.USD
        : "N/A";

      filteredProducts[sku] = {
        instanceType: product.attributes.instanceType || "N/A",
        vcpu: product.attributes.vcpu || "N/A",
        memory: product.attributes.memory || "N/A",
        network: product.attributes.networkPerformance || "N/A",
        description: product.attributes.description || "N/A",
        monthlyPrice: price !== "N/A" ? parseFloat(price) * 730 : "N/A",
      };
    }

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.status(200).json(filteredProducts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
