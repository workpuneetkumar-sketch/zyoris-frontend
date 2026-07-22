import React from "react";
import { ShieldCheck, Users, Lock, Clock } from "lucide-react";

export default function FeatureFooter() {
  const features = [
    {
      icon: <ShieldCheck className="w-5 h-5 text-gray-700" />,
      title: "Secure Access",
      desc: "Enterprise-grade security",
    },
    {
      icon: <Users className="w-5 h-5 text-gray-700" />,
      title: "Role Based",
      desc: "Access based on your role",
    },
    {
      icon: <Lock className="w-5 h-5 text-gray-700" />,
      title: "Protected Data",
      desc: "Your data is always safe",
    },
    {
      icon: <Clock className="w-5 h-5 text-gray-700" />,
      title: "Always Available",
      desc: "Access anytime, anywhere",
    },
  ];

  return (
    <div className="w-full flex flex-wrap justify-center items-center gap-6 sm:gap-12 py-8 text-center text-sm">
      {features.map((feature, index) => (
        <div key={index} className="flex items-center gap-3">
          <div className="flex-shrink-0">{feature.icon}</div>
          <div className="flex flex-col text-left">
            <span className="font-semibold text-gray-900">{feature.title}</span>
            <span className="text-gray-500 text-xs">{feature.desc}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
