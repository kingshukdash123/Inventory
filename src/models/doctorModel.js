export class Doctor {
    constructor({
        id = "",
        name = "",
        phone = "",
        address = "",
        taxId = "",
        dlNo = "",
        purchasedAmount = 0,
        paidAmount = 0,
        dueAmount = 0,
        createdAt = "",
        updatedAt = "",
    } = {}) {
        this.id = id;
        this.name = name;
        this.phone = phone;
        this.address = address;
        this.taxId = taxId;
        this.dlNo = dlNo;
        this.purchasedAmount = Number(purchasedAmount) || 0;
        this.paidAmount = Number(paidAmount) || 0;
        this.dueAmount = Number(dueAmount) || 0;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    static fromJson(json = {}) {
        return new Doctor({
            id: json.id || "",
            name: json.name || "",
            phone: json.phone || "",
            address: json.address || "",
            taxId: json.taxId || json.gstin || "",
            dlNo: json.dlNo || json.doctorDlNo || "",
            purchasedAmount: json.purchasedAmount || 0,
            paidAmount: json.paidAmount || 0,
            dueAmount: json.dueAmount || 0,
            createdAt: json.createdAt?.toDate?.() || json.createdAt || "",
            updatedAt: json.updatedAt?.toDate?.() || json.updatedAt || "",
        });
    }

    toJson() {
        return {
            name: this.name,
            phone: this.phone,
            address: this.address,
            taxId: this.taxId,
            dlNo: this.dlNo,
            purchasedAmount: this.purchasedAmount,
            paidAmount: this.paidAmount,
            dueAmount: this.dueAmount,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
        };
    }
}
