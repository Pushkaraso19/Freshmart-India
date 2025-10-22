import { Outlet, useLocation } from 'react-router-dom'
import Header from './Header.jsx'
import Footer from './Footer.jsx'

export default function Layout(){
  const location = useLocation()
  return (
    <div>
      <Header />
      <main key={location.key}>
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}
