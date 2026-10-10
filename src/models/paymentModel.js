export class DoctorPayment {
    constructor({
        id = "",
        doctorId = "",
        doctorName = "",
        amount = 0,
        paymentDate = "",
        paymentMode = "", // Cash, UPI, Card, Cheque, Bank Transfer
        notes = "",
        createdAt = "",
    } = {}) {
        this.id = id;
        this.doctorId = doctorId;
        this.doctorName = doctorName;
        this.amount = Number(amount) || 0;
        this.paymentDate = paymentDate;
        this.paymentMode = paymentMode;
        this.notes = notes;
        this.createdAt = createdAt;
    }

    static fromJson(json = {}) {
        return new DoctorPayment({
            id: json.id || "",
            doctorId: json.doctorId || "",
            doctorName: json.doctorName || "",
            amount: json.amount || 0,
            paymentDate: json.paymentDate || "",
            paymentMode: json.paymentMode || "",
            notes: json.notes || "",
            createdAt: json.createdAt?.toDate?.() || json.createdAt || "",
        });
    }

    toJson() {
        return {
            doctorId: this.doctorId,
            doctorName: this.doctorName,
            amount: this.amount,
            paymentDate: this.paymentDate,
            paymentMode: this.paymentMode,
            notes: this.notes,
            createdAt: this.createdAt,
        };
    }
}
