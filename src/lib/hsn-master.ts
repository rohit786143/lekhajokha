export interface HsnEntry {
  hsnCode: string;
  description: string;
  gstRate: number;
}

export const HSN_MASTER: HsnEntry[] = [
  { hsnCode: "8528", description: "Monitors and Projectors, Televisions (LED, LCD)", gstRate: 18 },
  { hsnCode: "8471", description: "Automatic data processing machines (Computers, Laptops)", gstRate: 18 },
  { hsnCode: "8517", description: "Telephone sets, including smartphones and mobile phones", gstRate: 18 },
  { hsnCode: "6109", description: "T-shirts, singlets and other vests, knitted or crocheted", gstRate: 5 },
  { hsnCode: "6205", description: "Men's or boys' shirts", gstRate: 5 },
  { hsnCode: "6204", description: "Women's or girls' suits, ensembles, jackets, blazers, dresses, skirts", gstRate: 5 },
  { hsnCode: "6403", description: "Footwear with outer soles of rubber, plastics, leather", gstRate: 18 },
  { hsnCode: "1905", description: "Bread, pastry, cakes, biscuits and other bakers' wares", gstRate: 18 },
  { hsnCode: "0901", description: "Coffee, whether or not roasted or decaffeinated", gstRate: 5 },
  { hsnCode: "0902", description: "Tea, whether or not flavoured", gstRate: 5 },
  { hsnCode: "1006", description: "Rice", gstRate: 5 },
  { hsnCode: "1101", description: "Wheat or meslin flour", gstRate: 5 },
  { hsnCode: "3004", description: "Medicaments consisting of mixed or unmixed products for therapeutic uses", gstRate: 12 },
  { hsnCode: "3304", description: "Beauty or make-up preparations and preparations for the care of the skin", gstRate: 18 },
  { hsnCode: "3401", description: "Soap; organic surface-active products and preparations for use as soap", gstRate: 18 },
  { hsnCode: "8703", description: "Motor cars and other motor vehicles principally designed for the transport of persons", gstRate: 28 },
  { hsnCode: "8711", description: "Motorcycles (including mopeds) and cycles fitted with an auxiliary motor", gstRate: 28 },
  { hsnCode: "9403", description: "Other furniture and parts thereof", gstRate: 18 },
  { hsnCode: "9503", description: "Tricycles, scooters, pedal cars and similar wheeled toys; dolls' carriages", gstRate: 12 },
];
