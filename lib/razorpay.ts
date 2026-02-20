import Razorpay from 'razorpay';

let _razorpay: Razorpay | null = null;

export function getRazorpay() {
  if (!_razorpay) {
    _razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID!,
      key_secret: process.env.RAZORPAY_KEY_SECRET!
    });
  }
  return _razorpay;
}
