import Link from 'next/link';
import Image from 'next/image';

export const Logo = () => {
  return (
    <Link href="/" className="flex items-center gap-2">
      <Image src="/edwhere-logo.png" alt="Edwhere" width={40} height={40} />
      <span className="text-lg font-semibold font-poppins tracking-tight">
        <span className="text-foreground">ed</span>
        <span className="text-primary">where</span>
      </span>
    </Link>
  );
};
