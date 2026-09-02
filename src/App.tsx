import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import LoginForm from './components/LoginForm';
import Dashboard from './components/Dashboard';
import AdminDashboard from './components/AdminDashboard';
import SubmitReport from './components/SubmitReport';
import BookClient from './components/BookClient';
import TeamAssignments from './components/TeamAssignments';
import ViewReport from './components/ViewReport';
import CalendarView from './components/CalendarView';
import BookingRequests from './components/BookingRequests';
import AssistantRoute from './components/AssistantRoute';
import ClientHistory from './components/ClientHistory';
import CashPayments from './components/CashPayments';
import TaskManager from './components/TaskManager';
import ProceduresGuides from './components/ProceduresGuides';
import InvoiceMonitor from './components/InvoiceMonitor';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const technician = sessionStorage.getItem('technician');
  if (!technician) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const technician = JSON.parse(sessionStorage.getItem('technician') || '{}');
  if (!technician || technician.role !== 'Admin') return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

function SeniorRoute({ children }: { children: React.ReactNode }) {
  const technician = JSON.parse(sessionStorage.getItem('technician') || '{}');
  if (!technician || !['Admin', 'Pool Tech Senior'].includes(technician.role)) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

function TeamAssignmentsRoute({ children }: { children: React.ReactNode }) {
  const technician = JSON.parse(sessionStorage.getItem('technician') || '{}');
  if (!technician || !['Admin', 'Pool Tech Senior', 'Assistant Pool Tech'].includes(technician.role)) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" />
      <Routes>
        <Route path="/" element={<LoginForm />} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
        <Route path="/submit-report" element={<ProtectedRoute><SubmitReport /></ProtectedRoute>} />
        <Route path="/book-client" element={<AdminRoute><BookClient /></AdminRoute>} />
        <Route path="/team-assignments" element={<TeamAssignmentsRoute><TeamAssignments /></TeamAssignmentsRoute>} />
        <Route path="/view-report" element={<SeniorRoute><ViewReport /></SeniorRoute>} />
        <Route path="/calendar" element={<TeamAssignmentsRoute><CalendarView /></TeamAssignmentsRoute>} />
        <Route path="/booking-requests" element={<AdminRoute><BookingRequests /></AdminRoute>} />
        <Route path="/my-route" element={<TeamAssignmentsRoute><AssistantRoute /></TeamAssignmentsRoute>} />
        <Route path="/client-history" element={<AdminRoute><ClientHistory /></AdminRoute>} />
        <Route path="/cash-payments" element={<AdminRoute><CashPayments /></AdminRoute>} />
        <Route path="/tasks" element={<AdminRoute><TaskManager /></AdminRoute>} />
        <Route path="/job-status" element={<AdminRoute><InvoiceMonitor /></AdminRoute>} />
        <Route path="/procedures" element={<ProtectedRoute><ProceduresGuides /></ProtectedRoute>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
