import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Data Deletion Policy | Edwhere',
  description: 'Learn how to request account and data deletion for your Edwhere account.'
};

export default function DeleteAccountPage() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-16 font-inter text-[#232228]">
      <h1 className="text-4xl font-bold mb-8 text-[#F80602]">Account & Data Deletion</h1>

      <div className="prose prose-slate max-w-none space-y-6">
        <p className="text-lg">
          At Edwhere, we respect your privacy and your right to control your personal data. If you
          wish to delete your account and all associated data, you can do so at any time.
        </p>

        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 my-8">
          <h2 className="text-2xl font-semibold mb-4">How to Delete Your Account</h2>

          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium mb-2">
                Option 1: Email Request (Recommended if you uninstalled the app)
              </h3>
              <p className="text-gray-600 mb-2">
                Send an email to our support team from the email address associated with your
                account:
              </p>
              <ul className="list-disc pl-6 text-gray-600 space-y-1">
                <li>
                  <strong>To:</strong> support@edwhere.com
                </li>
                <li>
                  <strong>Subject:</strong> Account Deletion Request
                </li>
                <li>
                  <strong>Body:</strong> Please include your full name and the phone number
                  associated with your account to help us verify your identity.
                </li>
              </ul>
              <p className="text-sm text-gray-500 mt-2">
                We will process your request and confirm the deletion within 3-5 business days.
              </p>
            </div>

            <hr className="border-gray-200" />

            <div>
              <h3 className="text-lg font-medium mb-2">Option 2: Delete via Web/App</h3>
              <p className="text-gray-600">
                Log in to your Edwhere account on our website. Navigate to your Profile/Account
                Settings, and look for the &quot;Delete Account&quot; option. Follow the on-screen
                prompts to permanently remove your data.
              </p>
            </div>
          </div>
        </div>

        <h2 className="text-xl font-semibold mt-8 mb-4">
          What happens when your account is deleted?
        </h2>
        <ul className="list-disc pl-6 space-y-2 text-gray-600">
          <li>Your personal profile information will be permanently removed.</li>
          <li>You will lose access to all your enrolled courses, certificates, and progress.</li>
          <li>
            Your purchase history will be anonymized or deleted, subject to legal and tax retention
            requirements.
          </li>
          <li>This action is irreversible. Once deleted, your account cannot be recovered.</li>
        </ul>

        <p className="text-gray-600 mt-8">
          If you have any questions or need further assistance, please contact our support team.
        </p>
      </div>
    </div>
  );
}
