import classNames from "classnames";

interface AvatarProps {
  src?: string;
  alt: string;
  fallback?: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizeClasses: Record<string, string> = {
  sm: "w-8 h-8 text-xs",
  md: "w-10 h-10 text-sm",
  lg: "w-12 h-12 text-base",
  xl: "w-16 h-16 text-lg",
};

export function Avatar({
  src,
  alt,
  fallback,
  size = "md",
  className,
}: AvatarProps) {
  return (
    <div
      className={classNames(
        "relative flex items-center justify-center rounded-full bg-primary-light text-primary font-medium overflow-hidden",
        sizeClasses[size],
        className
      )}
    >
      {src ? (
        <img
          src={src}
          alt={alt}
          className="w-full h-full object-cover"
        />
      ) : (
        <span>{fallback || alt.charAt(0).toUpperCase()}</span>
      )}
    </div>
  );
}
