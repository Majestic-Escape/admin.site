import { TaxAmountForm } from "./tax-amount-form";

export default function ManageFeesPage() {
  return (
    <div className="container  py-6 pb-24 md:pb-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl ">
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">
          Manage Additional Fees
        </h1>
        <p className="text-sm text-gray-600 mb-6">
          Please enter the percentage for Majestic Escape platform fees and GST.
        </p>
        <div className="bg-white shadow-md rounded-lg overflow-hidden">
          <div className="p-6 sm:p-8">
            <h2 className="text-lg font-medium text-gray-900 mb-2">
              Adjust Tax Setup
            </h2>
            <p className="text-sm text-gray-600 mb-6">
              {/* We take your financial security seriously and encrypt all
              sensitive information. */}
            </p>
            <TaxAmountForm />
          </div>
        </div>
      </div>
    </div>
  );
}
