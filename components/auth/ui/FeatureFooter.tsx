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
    <div className="w-full flex flex-nowrap justify-center items-center gap-2.5 sm:gap-6 md:gap-10 py-6 text-center text-sm overflow-x-auto scrollbar-hide">
      {features.map((feature, index) => (
        <div key={index} className="flex items-center gap-1.5 sm:gap-2 whitespace-nowrap shrink-0">
          <div className="flex-shrink-0 scale-90 sm:scale-100">{feature.icon}</div>
          <div className="flex items-baseline gap-1 sm:gap-1.5">
            <span className="font-semibold text-gray-900 text-[11px] sm:text-sm">{feature.title}</span>
            <span className="text-gray-500 text-[10px] sm:text-xs">{feature.desc}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
