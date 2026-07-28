export class StockItem {
    constructor({
        id = "",

        // Unique Key = medicineName + batchNo + expiryDate
        medicineName = "",
        batchNo = "",
        expiryDate = "",
        supplierName = "",

        // Pricing
        mrp = 0,
        purchaseRate = 0,
        doctorRate = 0,

        doctorDisc = 0,
        discount = 0,

        cgstPercent = 0,
        sgstPercent = 0,

        // Stock
        receivedQuantity = 0,
        availableQuantity = 0,

        // Metadata
        createdAt = "",
        updatedAt = "",
    } = {}) {
        this.id = id;

        this.medicineName = medicineName;
        this.batchNo = batchNo;
        this.expiryDate = expiryDate;
        this.supplierName = supplierName;

        this.mrp = Number(mrp) || 0;
        this.purchaseRate = Number(purchaseRate) || 0;
        this.doctorRate = Number(doctorRate) || 0;

        this.doctorDisc = Number(doctorDisc) || 0;
        this.discount = Number(discount) || 0;

        this.cgstPercent = Number(cgstPercent) || 0;
        this.sgstPercent = Number(sgstPercent) || 0;

        this.receivedQuantity = Number(receivedQuantity) || 0;
        this.availableQuantity = Number(availableQuantity) || 0;

        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    static fromJson(json = {}) {
        return new StockItem({
            id: json.id || "",

            medicineName: json.medicineName || "",
            batchNo: json.batchNo || "",
            expiryDate: json.expiryDate || "",
            supplierName: json.supplierName || json.companyName || "",

            mrp: json.mrp || 0,
            purchaseRate: json.purchaseRate || 0,
            doctorRate: json.doctorRate || 0,

            doctorDisc: json.doctorDisc || 0,
            discount: json.discount || 0,

            cgstPercent: json.cgstPercent || 0,
            sgstPercent: json.sgstPercent || 0,

            receivedQuantity: json.receivedQuantity || 0,
            availableQuantity: json.availableQuantity || 0,

            createdAt: json.createdAt?.toDate?.() || json.createdAt || "",
            updatedAt: json.updatedAt?.toDate?.() || json.updatedAt || "",
        });
    }

    toJson() {
        return {
            medicineName: this.medicineName,
            batchNo: this.batchNo,
            expiryDate: this.expiryDate,
            supplierName: this.supplierName,

            mrp: this.mrp,
            purchaseRate: this.purchaseRate,
            doctorRate: this.doctorRate,

            doctorDisc: this.doctorDisc,
            discount: this.discount,

            cgstPercent: this.cgstPercent,
            sgstPercent: this.sgstPercent,

            receivedQuantity: this.receivedQuantity,
            availableQuantity: this.availableQuantity,

            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
        };
    }
}
