const fetch = require("node-fetch");

const pricingUrls = {
  fargate:
    "https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AmazonECS/current/index.json",
  documentdb:
    "https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AmazonDocDB/current/ap-northeast-1/index.json",
};

module.exports = async (req, res) => {
  const { service } = req.query;

  if (!service || !pricingUrls[service]) {
    return res
      .status(400)
      .json({ error: "Invalid or missing service parameter" });
  }

  try {
    const response = await fetch(pricingUrls[service]);

    if (!response.ok) {
      throw new Error(
        `AWS Pricing API error: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();

    const products = data.products;
    const terms = data.terms.OnDemand;

    const filteredProducts = {};

    for (let sku in products) {
      const product = products[sku];
      const attributes = product.attributes || {};

      const priceData = terms[sku];
      if (!priceData) continue;

      const priceDimensions = Object.values(priceData)[0].priceDimensions;
      const price = priceDimensions
        ? Object.values(priceDimensions)[0].pricePerUnit.USD
        : "N/A";

      let key, details;

      if (service === "documentdb") {
        if (!attributes.instanceType) continue;

        key = attributes.instanceType;
        details = {
          instanceType: attributes.instanceType,
          vcpu: attributes.vcpu || "N/A",
          memory: attributes.memory || "N/A",
          network: attributes.networkPerformance || "N/A",
          monthlyPrice: price !== "N/A" ? parseFloat(price) * 730 : "N/A",
        };
      } else if (service === "fargate") {
        // Fargateの料金のみ絞り込み（"Fargate-"を含むusagetypeに限定）
        if (
          !(attributes.usagetype && attributes.usagetype.includes("Fargate-"))
        ) {
          continue;
        }

        key = attributes.usagetype;
        details = {
          description: attributes.description || "N/A",
          monthlyPrice: price !== "N/A" ? parseFloat(price) * 730 : "N/A",
        };
      }

      filteredProducts[key] = details;
    }

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.status(200).json(filteredProducts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports.config = {
  runtime: "nodejs",
};
