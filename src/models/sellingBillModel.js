export class SellingBillItem {
    constructor({
        itemName = "",
        quantity = 0,
        batchNo = "",
        expiryDate = "",
        mrp = 0,
        discount = 0, // UI label is Disc
        rate = 0, // mrp * (100 - discount) / 100
        cgstPercent = 0,
        cgstAmount = 0,
        sgstPercent = 0,
        sgstAmount = 0,
        nettRate = 0,
        amount = 0,
    } = {}) {
        this.itemName = itemName;
        this.quantity = Number(quantity) || 0;
        this.batchNo = batchNo;
        this.expiryDate = expiryDate;
        this.mrp = Number(mrp) || 0;
        this.discount = Number(discount) || 0;
        this.rate = Number(rate) || 0;
        this.cgstPercent = Number(cgstPercent) || 0;
        this.cgstAmount = Number(cgstAmount) || 0;
        this.sgstPercent = Number(sgstPercent) || 0;
        this.sgstAmount = Number(sgstAmount) || 0;
        this.nettRate = Number(nettRate) || 0;
        this.amount = Number(amount) || 0;
    }

    static fromJson(json = {}) {
        return new SellingBillItem({
            itemName: json.itemName || "",
            quantity: json.quantity || 0,
            batchNo: json.batchNo || "",
            expiryDate: json.expiryDate || "",
            mrp: json.mrp || 0,
            discount: json.discount || 0,
            rate: json.rate || 0,
            cgstPercent: json.cgstPercent || 0,
            cgstAmount: json.cgstAmount || 0,
            sgstPercent: json.sgstPercent || 0,
            sgstAmount: json.sgstAmount || 0,
            nettRate: json.nettRate || 0,
            amount: json.amount || 0,
        });
    }

    toJson() {
        return {
            itemName: this.itemName,
            quantity: this.quantity,
            batchNo: this.batchNo,
            expiryDate: this.expiryDate,
            mrp: this.mrp,
            discount: this.discount,
            rate: this.rate,
            cgstPercent: this.cgstPercent,
            cgstAmount: this.cgstAmount,
            sgstPercent: this.sgstPercent,
            sgstAmount: this.sgstAmount,
            nettRate: this.nettRate,
            amount: this.amount,
        };
    }
}

export class SellingBillSummary {
    constructor({
        totalItems = 0,
        totalQuantity = 0,
        totalGst = 0,
        totalAmount = 0, // total nett amount of bill items
        fixedDiscount = 0,
        grandTotal = 0, // totalAmount - fixedDiscount
    } = {}) {
        this.totalItems = Number(totalItems) || 0;
        this.totalQuantity = Number(totalQuantity) || 0;
        this.totalGst = Number(totalGst) || 0;
        this.totalAmount = Number(totalAmount) || 0;
        this.fixedDiscount = Number(fixedDiscount) || 0;
        this.grandTotal = Number(grandTotal) || 0;
    }

    static fromJson(json = {}) {
        const totalAmount = Number(json.totalAmount) || 0;
        const fixedDiscount = Number(json.fixedDiscount) || 0;
        const grandTotal = Math.max(0, totalAmount - fixedDiscount);

        return new SellingBillSummary({
            totalItems: json.totalItems || 0,
            totalQuantity: json.totalQuantity || 0,
            totalGst: json.totalGst || 0,
            totalAmount: totalAmount,
            fixedDiscount: fixedDiscount,
            grandTotal: grandTotal,
        });
    }

    toJson() {
        return {
            totalItems: this.totalItems,
            totalQuantity: this.totalQuantity,
            totalGst: this.totalGst,
            totalAmount: this.totalAmount,
            fixedDiscount: this.fixedDiscount,
            grandTotal: this.grandTotal,
        };
    }
}

export class SellingBill {
    constructor({
        id = "",
        billNo = "",
        doctorId = "",
        doctorName = "",
        doctorPhone = "",
        doctorAddress = "",
        doctorTaxId = "",
        doctorDlNo = "",
        invoiceDate = "",
        notes = "",
        items = [],
        summary = {},
        createdAt = "",
        isDraft = false,
        stockSynced = false,
    } = {}) {
        this.id = id;
        this.billNo = billNo;
        this.doctorId = doctorId;
        this.doctorName = doctorName;
        this.doctorPhone = doctorPhone;
        this.doctorAddress = doctorAddress;
        this.doctorTaxId = doctorTaxId;
        this.doctorDlNo = doctorDlNo;
        this.invoiceDate = invoiceDate;
        this.notes = notes;
        this.items = items.map(item => item instanceof SellingBillItem ? item : new SellingBillItem(item));
        this.summary = summary instanceof SellingBillSummary ? summary : new SellingBillSummary(summary);
        this.createdAt = createdAt;
        this.isDraft = isDraft;
        this.stockSynced = stockSynced;
    }

    static fromJson(json = {}) {
        return new SellingBill({
            id: json.id || "",
            billNo: json.billNo || "",
            doctorId: json.doctorId || "",
            doctorName: json.doctorName || "",
            doctorPhone: json.doctorPhone || json.phone || "",
            doctorAddress: json.doctorAddress || json.address || "",
            doctorTaxId: json.doctorTaxId || json.taxId || json.gstin || "",
            doctorDlNo: json.doctorDlNo || json.dlNo || "",
            invoiceDate: json.invoiceDate || "",
            notes: json.notes || "",
            items: (json.items || []).map(item => SellingBillItem.fromJson(item)),
            summary: SellingBillSummary.fromJson(json.summary || {}),
            createdAt: json.createdAt?.toDate?.() || json.createdAt || "",
            isDraft: json.isDraft || false,
            stockSynced: json.stockSynced || false,
        });
    }

    toJson() {
        return {
            billNo: this.billNo,
            doctorId: this.doctorId,
            doctorName: this.doctorName,
            doctorPhone: this.doctorPhone,
            doctorAddress: this.doctorAddress,
            doctorTaxId: this.doctorTaxId,
            doctorDlNo: this.doctorDlNo,
            invoiceDate: this.invoiceDate,
            notes: this.notes,
            items: this.items.map(item => item.toJson()),
            summary: this.summary.toJson(),
            createdAt: this.createdAt,
            isDraft: this.isDraft,
            stockSynced: this.stockSynced,
        };
    }
}
