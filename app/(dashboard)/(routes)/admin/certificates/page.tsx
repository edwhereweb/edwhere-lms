import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import getSafeProfile from '@/actions/get-safe-profile';
import { CertificatesClient, type Certificate } from './_components/certificates-client';

export const dynamic = 'force-dynamic';

const AdminCertificatesPage = async () => {
  const profile = await getSafeProfile();
  if (!profile || profile.role !== 'ADMIN') {
    return redirect('/dashboard');
  }

  const certificates = await db.certificate.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      credentialId: true,
      recipientName: true,
      courseName: true,
      duration: true,
      deliveryMode: true,
      dateOfAchievement: true,
      createdAt: true
    }
  });

  return (
    <CertificatesClient
      initialCertificates={JSON.parse(JSON.stringify(certificates)) as Certificate[]}
    />
  );
};

export default AdminCertificatesPage;
