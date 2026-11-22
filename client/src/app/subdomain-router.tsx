import { Subdomain } from '@/pages/subdomain/subdomain-page';
import { BookingSuccessPage } from '@/pages/subdomain/booking-success-page';
import { Routes, Route, Navigate } from 'react-router';

const SubdomainRouter = () => {
  return (
    <Routes>
      <Route path="/">
        <Route index element={<Subdomain />} />
      </Route>
      <Route path="success" element={<BookingSuccessPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default SubdomainRouter;
