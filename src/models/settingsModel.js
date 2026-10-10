export class SellerDetails {
    constructor({
        name = "",
        address = "",
        gstin = "",
        contact = "",
        updatedAt = "",
    } = {}) {
        this.name = name;
        this.address = address;
        this.gstin = gstin;
        this.contact = contact;
        this.updatedAt = updatedAt;
    }

    static fromJson(json = {}) {
        return new SellerDetails({
            name: json.name || "",
            address: json.address || "",
            gstin: json.gstin || "",
            contact: json.contact || "",
            updatedAt: json.updatedAt?.toDate?.() || json.updatedAt || "",
        });
    }

    toJson() {
        return {
            name: this.name,
            address: this.address,
            gstin: this.gstin,
            contact: this.contact,
            updatedAt: this.updatedAt,
        };
    }
}
