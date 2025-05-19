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
  const { service, os } = req.query;

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

      if (service === "ec2") {
        if (
          !(
            product.attributes &&
            product.attributes.instanceType &&
            allowedInstanceTypes.some((type) =>
              product.attributes.instanceType.startsWith(type)
            ) &&
            product.attributes.tenancy === "Shared" &&
            product.attributes.preInstalledSw === "NA"
          )
        ) {
          continue;
        }

        // OSクエリパラメータで絞り込む（Amazon Linux 2023）
        if (
          (os && product.attributes.operatingSystem !== "Linux") ||
          product.attributes.operatingSystem !== "Linux"
        ) {
          continue;
        }

        // Amazon Linux 2023 の場合のみさらに詳細な絞り込み
        if (
          os === "amazon-linux-2023" &&
          !product.attributes.usagetype.includes("AL2023")
        ) {
          continue;
        }

        const instanceType = product.attributes.instanceType;

        if (filteredProducts[instanceType]) continue;

        const priceData = terms[sku];
        if (!priceData) continue;

        const priceDimensions = Object.values(priceData)[0].priceDimensions;
        const price = priceDimensions
          ? Object.values(priceDimensions)[0].pricePerUnit.USD
          : "N/A";

        filteredProducts[instanceType] = {
          instanceType,
          vcpu: product.attributes.vcpu,
          memory: product.attributes.memory,
          os: product.attributes.operatingSystem,
          monthlyPrice: price !== "N/A" ? parseFloat(price) * 730 : "N/A",
        };
      } else {
        const priceData = terms[sku];
        if (!priceData) continue;

        const priceDimensions = Object.values(priceData)[0].priceDimensions;
        const price = priceDimensions
          ? Object.values(priceDimensions)[0].pricePerUnit.USD
          : "N/A";

        const key = product.attributes.description || sku;
        filteredProducts[key] = {
          description: product.attributes.description || "N/A",
          monthlyPrice: price !== "N/A" ? parseFloat(price) * 730 : "N/A",
        };
      }
    }

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.status(200).json(filteredProducts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Node.jsランタイム指定（必須）
module.exports.config = {
  runtime: "nodejs",
};
