import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import MainLayout from '@/layouts/MainLayout';
import ProtectedRoute from '@/components/ProtectedRoute';
import Home from '@/pages/Index';
import About from '@/pages/About';
import WhoThisIsFor from '@/pages/WhoThisIsFor';
import SignIn from '@/pages/SignIn';
import SignUp from '@/pages/SignUp';
import Events from '@/pages/Events';
import Dashboard from '@/pages/Dashboard';
import Profile from '@/pages/Profile';
import CheckIn from '@/pages/CheckIn';
import HostDashboard from '@/pages/HostDashboard';
import NotFound from '@/pages/NotFound';

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<MainLayout />}>
              <Route path="/" element={<Home />} />
              <Route path="/about" element={<About />} />
              <Route path="/who-this-is-for" element={<WhoThisIsFor />} />
              <Route path="/signin" element={<SignIn />} />
              <Route path="/signup" element={<SignUp />} />
              <Route element={<ProtectedRoute />}>
                <Route path="/events" element={<Events />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/checkin/:eventId" element={<CheckIn />} />
                <Route path="/host" element={<HostDashboard />} />
                <Route path="/host/events/:eventId" element={<HostDashboard />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
