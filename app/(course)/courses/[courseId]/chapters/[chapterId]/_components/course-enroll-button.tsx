"use client";

import axios from "axios";
import { useState } from "react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";

interface CourseEnrollButtonProps {
  courseId: string;
  price: number;
}

declare global {
  interface Window {
    Razorpay: any;
  }
}

export const CourseEnrollButton = ({ courseId, price }: CourseEnrollButtonProps) => {
  const [isLoading, setIsLoading] = useState(false);

  const onClick = async () => {
    try {
      setIsLoading(true);

      const { data } = await axios.post(`/api/courses/${courseId}/checkout`);

      // Dynamically load Razorpay checkout script
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      document.body.appendChild(script);

      script.onload = () => {
        const options = {
          key: data.keyId,
          amount: data.amount,
          currency: data.currency,
          name: data.courseName,
          description: "Course Enrollment",
          order_id: data.orderId,
          prefill: {
            email: data.userEmail,
            name: data.userName,
          },
          handler: async (response: any) => {
            try {
              await axios.post("/api/razorpay/verify", {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                courseId,
              });
              toast.success("Payment successful! You are now enrolled.");
              window.location.reload();
            } catch {
              toast.error("Payment verification failed.");
            }
          },
          modal: {
            ondismiss: () => {
              setIsLoading(false);
            },
          },
          theme: {
            color: "#0369a1",
          },
        };

        const rzp = new window.Razorpay(options);
        rzp.open();
        setIsLoading(false);
      };
    } catch {
      toast.error("Something went wrong");
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={onClick}
      disabled={isLoading}
      size="sm"
      className="w-full md:w-auto"
    >
      Enroll for ₹{price}
    </Button>
  );
};