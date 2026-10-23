import Image from "next/image";
import Link from "next/link";
import logo from "@/docs/assets/celloras-logo.png";

export function Brand({ href = "/" }: { href?: string }) {
  return (
    <Link className="brand" href={href} aria-label="Celloras home">
      <Image src={logo} alt="Celloras" sizes="224px" className="brand-image" />
    </Link>
  );
}

/** Display only the cell from the supplied image; preserve the source bytes. */
export function BrandMark({ size = 32 }: { size?: number }) {
  return (
    <span
      aria-hidden="true"
      style={{
        display: "inline-block",
        position: "relative",
        width: size,
        height: size,
        overflow: "hidden",
        flexShrink: 0,
      }}
    >
      <Image
        src={logo}
        alt=""
        sizes={`${Math.ceil(size * 4.24)}px`}
        style={{
          position: "absolute",
          width: "424%",
          maxWidth: "none",
          height: "auto",
          left: "-48%",
          top: "-89%",
          mixBlendMode: "multiply",
        }}
      />
    </span>
  );
}
