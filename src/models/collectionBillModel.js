export class CollectionBillItem {
    constructor({
        itemName = "",
        quantity = 0,
        batchNo = "",
        expiryDate = "",
        mrp = 0,
        doctorDisc = 0,
        doctorRate = 0,
        discount = 0,
        discountAmount = 0,
        taxableBase = 0,
        cgstPercent = 0,
        cgstAmount = 0,
        sgstPercent = 0,
        sgstAmount = 0,
        nettRate = 0,
        amount = 0,
        totalDoctorRate = 0,
        totalCgst = 0,
        totalSgst = 0,
        totalDiscount = 0,
    } = {}) {
        this.itemName = itemName;
        this.quantity = Number(quantity) || 0;
        this.batchNo = batchNo;
        this.expiryDate = expiryDate;
        this.mrp = Number(mrp) || 0;
        this.doctorDisc = Number(doctorDisc) || 0;
        this.doctorRate = Number(doctorRate) || 0;
        this.discount = Number(discount) || 0;
        this.discountAmount = Number(discountAmount) || 0;
        this.taxableBase = Number(taxableBase) || 0;
        this.cgstPercent = Number(cgstPercent) || 0;
        this.cgstAmount = Number(cgstAmount) || 0;
        this.sgstPercent = Number(sgstPercent) || 0;
        this.sgstAmount = Number(sgstAmount) || 0;
        this.nettRate = Number(nettRate) || 0;
        this.amount = Number(amount) || 0;
        this.totalDoctorRate = Number(totalDoctorRate) || 0;
        this.totalCgst = Number(totalCgst) || 0;
        this.totalSgst = Number(totalSgst) || 0;
        this.totalDiscount = Number(totalDiscount) || 0;
    }

    static fromJson(json = {}) {
        return new CollectionBillItem({
            itemName: json.itemName || "",
            quantity: json.quantity || 0,
            batchNo: json.batchNo || "",
            expiryDate: json.expiryDate || "",
            mrp: json.mrp || 0,
            doctorDisc: json.doctorDisc || 0,
            doctorRate: json.doctorRate || 0,
            discount: json.discount || 0,
            discountAmount: json.discountAmount || 0,
            taxableBase: json.taxableBase || 0,
            cgstPercent: json.cgstPercent || 0,
            cgstAmount: json.cgstAmount || 0,
            sgstPercent: json.sgstPercent || 0,
            sgstAmount: json.sgstAmount || 0,
            nettRate: json.nettRate || 0,
            amount: json.amount || 0,
            totalDoctorRate: json.totalDoctorRate || 0,
            totalCgst: json.totalCgst || 0,
            totalSgst: json.totalSgst || 0,
            totalDiscount: json.totalDiscount || 0,
        });
    }

    toJson() {
        return {
            itemName: this.itemName,
            quantity: this.quantity,
            batchNo: this.batchNo,
            expiryDate: this.expiryDate,
            mrp: this.mrp,
            doctorDisc: this.doctorDisc,
            doctorRate: this.doctorRate,
            discount: this.discount,
            discountAmount: this.discountAmount,
            taxableBase: this.taxableBase,
            cgstPercent: this.cgstPercent,
            cgstAmount: this.cgstAmount,
            sgstPercent: this.sgstPercent,
            sgstAmount: this.sgstAmount,
            nettRate: this.nettRate,
            amount: this.amount,
            totalDoctorRate: this.totalDoctorRate,
            totalCgst: this.totalCgst,
            totalSgst: this.totalSgst,
            totalDiscount: this.totalDiscount,
        };
    }
}

export class CollectionBillSummary {
    constructor({
        totalItems = 0,
        totalQuantity = 0,
        totalDoctorRate = 0,
        totalDiscount = 0,
        totalCgst = 0,
        totalSgst = 0,
        grandTotal = 0,
    } = {}) {
        this.totalItems = Number(totalItems) || 0;
        this.totalQuantity = Number(totalQuantity) || 0;
        this.totalDoctorRate = Number(totalDoctorRate) || 0;
        this.totalDiscount = Number(totalDiscount) || 0;
        this.totalCgst = Number(totalCgst) || 0;
        this.totalSgst = Number(totalSgst) || 0;
        this.grandTotal = Number(grandTotal) || 0;
    }

    static fromJson(json = {}) {
        return new CollectionBillSummary({
            totalItems: json.totalItems || 0,
            totalQuantity: json.totalQuantity || 0,
            totalDoctorRate: json.totalDoctorRate || 0,
            totalDiscount: json.totalDiscount || 0,
            totalCgst: json.totalCgst || 0,
            totalSgst: json.totalSgst || 0,
            grandTotal: json.grandTotal || 0,
        });
    }

    toJson() {
        return {
            totalItems: this.totalItems,
            totalQuantity: this.totalQuantity,
            totalDoctorRate: this.totalDoctorRate,
            totalDiscount: this.totalDiscount,
            totalCgst: this.totalCgst,
            totalSgst: this.totalSgst,
            grandTotal: this.grandTotal,
        };
    }
}

export class CollectionBill {
    constructor({
        id = "",
        billNo = "",
        supplierName = "",
        invoiceDate = "",
        notes = "",
        items = [],
        summary = {},
        createdAt = "",
        isDraft = false,
        addedToStock = false,
    } = {}) {
        this.id = id;
        this.billNo = billNo;
        this.supplierName = supplierName;
        this.invoiceDate = invoiceDate;
        this.notes = notes;
        this.items = items.map(item => item instanceof CollectionBillItem ? item : new CollectionBillItem(item));
        this.summary = summary instanceof CollectionBillSummary ? summary : new CollectionBillSummary(summary);
        this.createdAt = createdAt;
        this.isDraft = isDraft;
        this.addedToStock = addedToStock;
    }

    static fromJson(json = {}) {
        return new CollectionBill({
            id: json.id || "",
            billNo: json.billNo || "",
            supplierName: json.supplierName || "",
            invoiceDate: json.invoiceDate || "",
            notes: json.notes || "",
            items: (json.items || []).map(item => CollectionBillItem.fromJson(item)),
            summary: CollectionBillSummary.fromJson(json.summary || {}),
            createdAt: json.createdAt?.toDate?.() || json.createdAt || "",
            isDraft: json.isDraft || false,
            addedToStock: json.addedToStock || false,
        });
    }

    toJson() {
        return {
            billNo: this.billNo,
            supplierName: this.supplierName,
            invoiceDate: this.invoiceDate,
            notes: this.notes,
            items: this.items.map(item => item.toJson()),
            summary: this.summary.toJson(),
            createdAt: this.createdAt,
            isDraft: this.isDraft,
            addedToStock: this.addedToStock,
        };
    }
}
