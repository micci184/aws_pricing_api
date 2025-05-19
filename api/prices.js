const fetch = require("node-fetch");

const documentDbUrl =
  "https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AmazonDocDB/current/ap-northeast-1/index.json";

module.exports = async (req, res) => {
  try {
    const response = await fetch(documentDbUrl);

    if (!response.ok) {
      throw new Error(
        `AWS Pricing API error: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();

    const products = data.products;
    const terms = data.terms.OnDemand;

    const filteredProducts = {};

    for (const sku in products) {
      const attributes = products[sku].attributes || {};

      const priceData = terms[sku];
      if (!priceData) continue;

      const priceDimensions = Object.values(priceData)[0].priceDimensions;
      const price = priceDimensions
        ? Object.values(priceDimensions)[0].pricePerUnit.USD
        : "N/A";

      if (!attributes.instanceType) continue;

      filteredProducts[sku] = {
        servicecode: attributes.servicecode || "N/A",
        location: attributes.location || "N/A",
        instanceType: attributes.instanceType || "N/A",
        vcpu: attributes.vcpu || "N/A",
        physicalProcessor: attributes.physicalProcessor || "N/A",
        memory: attributes.memory || "N/A",
        databaseEngine: attributes.databaseEngine || "N/A",
        usagetype: attributes.usagetype || "N/A",
        instanceTypeFamily: attributes.instanceTypeFamily || "N/A",
        normalizationSizeFactor: attributes.normalizationSizeFactor || "N/A",
        regionCode: attributes.regionCode || "N/A",
        servicename: attributes.servicename || "N/A",
        volumeoptimization: attributes.volumeoptimization || "N/A",
        monthlyPrice: price !== "N/A" ? parseFloat(price) * 730 : "N/A",
      };
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
