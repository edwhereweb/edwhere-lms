import Razorpay from 'razorpay';
import { env } from '@/lib/env';

let _razorpay: Razorpay | null = null;

export function getRazorpay() {
  if (!_razorpay) {
    _razorpay = new Razorpay({
      key_id: env.RAZORPAY_KEY_ID,
      key_secret: env.RAZORPAY_KEY_SECRET
    });
  }
  return _razorpay;
}
