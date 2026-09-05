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
    <div className="w-full grid grid-cols-2 gap-3 sm:flex sm:flex-nowrap sm:justify-center items-center sm:gap-6 md:gap-10 py-4 sm:py-6 text-center text-sm">
      {features.map((feature, index) => (
        <div key={index} className="flex items-center justify-center sm:justify-start gap-1.5 sm:gap-2 shrink-0">
          <div className="flex-shrink-0 scale-90 sm:scale-100">{feature.icon}</div>
          <div className="flex flex-col sm:flex-row items-start sm:items-baseline gap-0 sm:gap-1.5 text-left sm:text-left">
            <span className="font-semibold text-gray-900 text-[11px] sm:text-sm">{feature.title}</span>
            <span className="text-gray-500 text-[10px] sm:text-xs hidden xs:inline">{feature.desc}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
