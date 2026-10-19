export class SellerDetails {
    constructor({
        name = "",
        address = "",
        gstin = "",
        dlNo = "",
        contact = "",
        updatedAt = "",
    } = {}) {
        this.name = name;
        this.address = address;
        this.gstin = gstin;
        this.dlNo = dlNo;
        this.contact = contact;
        this.updatedAt = updatedAt;
    }

    static fromJson(json = {}) {
        return new SellerDetails({
            name: json.name || "",
            address: json.address || "",
            gstin: json.gstin || "",
            dlNo: json.dlNo || json.dl_no || json.dlNumber || "",
            contact: json.contact || "",
            updatedAt: json.updatedAt?.toDate?.() || json.updatedAt || "",
        });
    }

    toJson() {
        return {
            name: this.name,
            address: this.address,
            gstin: this.gstin,
            dlNo: this.dlNo,
            contact: this.contact,
            updatedAt: this.updatedAt,
        };
    }
}
