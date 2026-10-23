import Image from "next/image";
import Link from "next/link";
import logo from "@/docs/assets/celloras-logo.png";

export function Brand() {
  return (
    <Link className="brand" href="/" aria-label="Celloras home">
      <Image src={logo} alt="Celloras" sizes="224px" className="brand-image" />
    </Link>
  );
}
