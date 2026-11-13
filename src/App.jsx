import { Suspense, lazy } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AdminShell, AppShell, Loading, Navbar, PublicLayout, RequireAuth } from './components/Layout.jsx'
import Landing from './pages/Landing.jsx'
const Demo = lazy(() => import('./pages/Demo.jsx'))
import { ForgotPassword, Login, Register } from './pages/Auth.jsx'
const PublicSign = lazy(() => import('./pages/PublicSign.jsx'))
const DevelopersPublic = lazy(() => import('./pages/DevelopersPublic.jsx'))
import NotFound from './pages/NotFound.jsx'
const Dashboard = lazy(() => import('./pages/app/Dashboard.jsx'))
const Documents = lazy(() => import('./pages/app/Documents.jsx'))
const DocumentSign = lazy(() => import('./pages/app/DocumentSign.jsx'))
const Templates = lazy(() => import('./pages/app/Templates.jsx'))
const TemplateBuilder = lazy(() => import('./pages/app/TemplateBuilder.jsx'))
const TemplateDetail = lazy(() => import('./pages/app/TemplateDetail.jsx'))
const Developers = lazy(() => import('./pages/app/Developers.jsx'))
const Profile = lazy(() => import('./pages/app/Profile.jsx'))
const AdminOverview = lazy(() => import('./pages/admin/AdminOverview.jsx'))
const AdminEvents = lazy(() => import('./pages/admin/AdminEvents.jsx'))
const AdminUsers = lazy(() => import('./pages/admin/AdminUsers.jsx'))
const AdminRoles = lazy(() => import('./pages/admin/AdminRoles.jsx'))

function Ambient() {
  return <div className="aurora" aria-hidden><span /><span /><span /></div>
}

export default function App() {
  return (
    <>
      <Ambient />
      <Suspense fallback={<Loading />}>
      <Routes>
        {/* Public signing page has no chrome (it can be embedded in an iframe) */}
        <Route path="/sign/:token" element={<PublicSign />} />

        <Route element={<PublicLayout />}>
          <Route index element={<Landing />} />
          <Route path="demo" element={<Demo />} />
          <Route path="developers" element={<DevelopersPublic />} />
          <Route path="login" element={<Login />} />
          <Route path="register" element={<Register />} />
          <Route path="forgot-password" element={<ForgotPassword />} />
          <Route path="*" element={<NotFound />} />
        </Route>

        <Route path="/app" element={<RequireAuth><Navbar /><AppShell /></RequireAuth>}>
          <Route index element={<Dashboard />} />
          <Route path="documents" element={<Documents />} />
          <Route path="documents/:id/sign" element={<DocumentSign />} />
          <Route path="templates" element={<RequireAuth perm="template.create"><Templates /></RequireAuth>} />
          <Route path="templates/new" element={<RequireAuth perm="template.create"><TemplateBuilder /></RequireAuth>} />
          <Route path="templates/:id" element={<RequireAuth perm="template.create"><TemplateDetail /></RequireAuth>} />
          <Route path="templates/:id/edit" element={<RequireAuth perm="template.manage"><TemplateBuilder /></RequireAuth>} />
          <Route path="developers" element={<RequireAuth perm="api.keys.manage"><Developers /></RequireAuth>} />
          <Route path="profile" element={<Profile />} />
          <Route path="settings" element={<Navigate to="/app/profile" replace />} />
          <Route path="*" element={<NotFound compact />} />
        </Route>

        <Route path="/admin" element={<RequireAuth perm="admin.dashboard.view"><Navbar /><AdminShell /></RequireAuth>}>
          <Route index element={<AdminOverview />} />
          <Route path="events" element={<RequireAuth perm="admin.events.view"><AdminEvents /></RequireAuth>} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="roles" element={<AdminRoles />} />
          <Route path="profile" element={<Profile />} />
          <Route path="*" element={<NotFound compact />} />
        </Route>
      </Routes>
      </Suspense>
    </>
  )
}
