export default function TermsAndConditions() {
  return (
    <div className="max-w-3xl mx-auto py-12 px-4 text-gray-800">
      <h1 className="text-3xl font-bold mb-6">Terms & Conditions</h1>

      <p className="mb-6">
        Welcome to <strong>quickfynd.com</strong>. By accessing or using our website,
        you agree to follow the Terms & Conditions stated below. Please read them
        carefully. If you do not agree with any part of these terms, you must stop
        using the website immediately.
      </p>

      {/* Section */}
      <h2 className="text-xl font-semibold mt-6 mb-3">1. General Information</h2>
      <p className="mb-4">
        quickfynd.com (“we”, “our”, “us”) is an online shopping platform offering a
        range of products. By using our services, you acknowledge that you are at
        least 18 years old or accessing the website under the supervision of a
        parent or legal guardian.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-3">2. Account & Registration</h2>
      <ul className="list-disc ml-6 mb-4">
        <li>You may browse the website without creating an account.</li>
        <li>
          If you create an account, you are responsible for maintaining the
          confidentiality of your login credentials.
        </li>
        <li>
          You agree to provide accurate and updated information when registering.
        </li>
      </ul>

      <h2 className="text-xl font-semibold mt-6 mb-3">3. Product Information</h2>
      <p className="mb-4">
        We make every effort to ensure product descriptions, images, and details
        are accurate. However, slight variations may occur. quickfynd.com is not
        responsible for typographical errors, incorrect pricing, or inaccurate
        product data.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-3">4. Pricing & Payments</h2>
      <ul className="list-disc ml-6 mb-4">
        <li>All prices listed on the website are inclusive/exclusive of taxes as applicable.</li>
        <li>
          Payments made on quickfynd.com must be from valid payment methods (Card,
          UPI, Wallet, EMI, Net Banking depending on availability).
        </li>
        <li>
          We reserve the right to modify prices at any time without prior notice.
        </li>
      </ul>

      <h2 className="text-xl font-semibold mt-6 mb-3">5. Order Acceptance</h2>
      <p className="mb-4">
        Your order is considered accepted only when it is confirmed by us. We may
        refuse or cancel an order due to:
      </p>
      <ul className="list-disc ml-6 mb-4">
        <li>Product unavailability</li>
        <li>Incorrect pricing</li>
        <li>Suspicious or fraudulent activity</li>
        <li>Invalid payment information</li>
      </ul>

      <h2 className="text-xl font-semibold mt-6 mb-3">6. Shipping & Delivery</h2>
      <ul className="list-disc ml-6 mb-4">
        <li>Delivery timelines are estimates and may vary depending on location.</li>
        <li>
          quickfynd.com is not liable for delays caused by logistics partners,
          weather conditions, or unforeseen events.
        </li>
        <li>
          You must provide accurate shipping information to avoid delays or lost
          packages.
        </li>
      </ul>

      <h2 className="text-xl font-semibold mt-6 mb-3">7. Returns, Refunds & Cancellations</h2>
      <p className="mb-4">Returns and refunds are governed by our return policy.</p>
      <ul className="list-disc ml-6 mb-4">
        <li>Products eligible for return must be unused and in original condition.</li>
        <li>Refunds will be processed to the original payment method only.</li>
        <li>Cancellations must be requested before the order is shipped.</li>
      </ul>

      <h2 className="text-xl font-semibold mt-6 mb-3">8. User Conduct</h2>
      <p className="mb-4">You agree not to:</p>
      <ul className="list-disc ml-6 mb-4">
        <li>Use the website for unlawful or fraudulent purposes.</li>
        <li>Copy, modify, or distribute content without permission.</li>
        <li>Disrupt website functionality through hacking or harmful software.</li>
      </ul>

      <h2 className="text-xl font-semibold mt-6 mb-3">9. Intellectual Property</h2>
      <p className="mb-4">
        All content on quickfynd.com including text, images, logos, design, and
        graphics are the property of quickfynd.com and protected by applicable laws.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-3">10. Limitation of Liability</h2>
      <p className="mb-4">
        quickfynd.com is not liable for any indirect, incidental, or consequential
        damages resulting from the use of our website or products.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-3">11. Third-Party Links</h2>
      <p className="mb-4">
        Our website may include links to third-party sites. We are not responsible
        for their content, privacy policies, or practices.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-3">12. Changes to Terms</h2>
      <p className="mb-4">
        We may update these Terms & Conditions at any time. Continued use of the
        website means you accept the revised terms.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-3">13. Contact Information</h2>
      <p className="mb-4">
        If you have any questions regarding these Terms & Conditions, you may
        contact us at:
      </p>

      <p className="font-semibold">Email: support@quickfynd.com</p>
      <p className="font-semibold mb-10">Website: https://quickfynd.com</p>
    </div>
  );
}
