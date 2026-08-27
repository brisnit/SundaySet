import Image from "next/image";

import { avatarColorClass } from "@/lib/validation/account";
import { cn } from "@/lib/utils";

export function initialsOf(nameOrEmail: string): string {
  return nameOrEmail
    .split(/[\s@.]+/)
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/**
 * A photo when there is one, otherwise a monogram on the chosen colour. The
 * fallback is not a placeholder — it is a first-class option, so the account
 * icon is changeable whether or not file storage is configured.
 */
export function Avatar({
  name,
  image,
  color,
  className,
  size = 36,
}: {
  name: string;
  image?: string | null;
  color?: string | null;
  className?: string;
  size?: number;
}) {
  if (image) {
    return (
      <Image
        src={image}
        alt=""
        width={size}
        height={size}
        className={cn("shrink-0 rounded-full object-cover", className)}
      />
    );
  }
  return (
    <span
      aria-hidden
      className={cn(
        "grid shrink-0 place-items-center rounded-full font-semibold",
        avatarColorClass(color),
        className,
      )}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.36) }}
    >
      {initialsOf(name)}
    </span>
  );
}
