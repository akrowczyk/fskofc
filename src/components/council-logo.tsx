import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * Council #10325 emblem from kofc10325.org (private authenticated app use).
 */
export function CouncilLogo({
  className,
  size = 48,
  priority = false,
}: {
  className?: string;
  size?: number;
  priority?: boolean;
}) {
  return (
    <Image
      src="/logo_web.png"
      alt="Knights of Columbus Council #10325"
      width={size}
      height={size}
      priority={priority}
      className={cn("h-auto w-auto object-contain", className)}
      style={{ width: size, height: size }}
    />
  );
}
