import { Routes, Route } from 'react-router-dom';
import Home from '../pages/Home.jsx';
import Login from '../pages/Login.jsx';
import Register from '../pages/Register.jsx';
import ForgotPassword from '../pages/ForgotPassword.jsx';
import ResetPassword from '../pages/ResetPassword.jsx';
import HouseholdCustomers from '../pages/HouseholdCustomers.jsx';
import BusinessCustomers from '../pages/BusinessCustomers.jsx';
import AdminDashboard from '../pages/AdminDashboard.jsx';
import CustomerDashboard from '../pages/CustomerDashboard.jsx';
import CustomerNewApplication from '../pages/CustomerNewApplication.jsx';
import ApplicationView from '../pages/ApplicationView.jsx';
import AdminApplicationView from '../pages/AdminApplicationView.jsx';
// Uncomment these as each page is ready (make sure each has "export default")
// import Contact from '../pages/Contact.jsx';
// import Services from '../pages/Services.jsx';

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Password reset flow: /forgot-password collects the email and
          triggers the backend to send a reset link; that link points to
          /reset-password/:resettoken, where the user sets a new password.
          See authRoutes.js / authController.js for the matching endpoints. */}
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password/:resettoken" element={<ResetPassword />} />

      <Route path="/services/household" element={<HouseholdCustomers />} />
      <Route path="/services/business" element={<BusinessCustomers />} />
      <Route path="/admin-dashboard" element={<AdminDashboard />} />
      <Route path="/customer-dashboard" element={<CustomerDashboard />} />
      <Route path="/new-application" element={<CustomerNewApplication />} />
      {/* View and edit an existing customer application, reached from the
          eye / pencil icons in the "My Applications" table. The edit route
          reuses CustomerNewApplication, which pre-fills from the :ref param
          and calls updateApplication instead of addApplication on submit. */}
      <Route path="/applications/:ref" element={<ApplicationView />} />
      <Route path="/applications/:ref/edit" element={<CustomerNewApplication />} />

      {/* Admin/staff view of an application — separate from the customer's
          ApplicationView, with status-workflow actions instead of customer
          actions like "Submit Response" / "Cancel Application". */}
      <Route path="/admin-application/:ref" element={<AdminApplicationView />} />

      {/* <Route path="/contact" element={<Contact />} /> */}
      {/* <Route path="/services" element={<Services />} /> */}
      {/* <Route path="/connections" element={<ConnectionsHub />} /> */}
    </Routes>
  );
}