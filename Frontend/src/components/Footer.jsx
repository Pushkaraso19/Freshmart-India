import { Link } from 'react-router-dom'

export default function Footer(){
  return (
    <>
      <section className="footer">
        <div className="box-container">
          <div className="box">
            <h3>
              <i className="fa fa-shopping-basket"></i> FreshMart India
            </h3>
            <p>
              Fresh and organic grocery store delivering quality products across India. 
              We are committed to providing the best shopping experience with premium products and excellent service nationwide.
            </p>
            <div className="share">
              <a href="#" className="fa fa-facebook"></a>
              <a href="#" className="fa fa-twitter"></a>
              <a href="#" className="fa fa-instagram"></a>
              <a href="#" className="fa fa-linkedin"></a>
            </div>
          </div>

          <div className="box">
            <h3>Contact Information</h3>
            <Link to="#" className="links">
              <i className="fa fa-phone"></i> +91 98765 43210
            </Link>
            <Link to="#" className="links">
              <i className="fa fa-envelope"></i> info@freshmart.in
            </Link>
            <Link to="#" className="links">
              <i className="fa fa-map-marker"></i> Karjat, Maharashtra
            </Link>
          </div>

          <div className="box">
            <h3>Quick Navigation</h3>
            <Link to="/" className="links">
              <i className="fa fa-shopping-bag"></i> Shopping
            </Link>
            <Link to="/about" className="links">
              <i className="fa fa-info-circle"></i> About Us
            </Link>
            <Link to="/contact" className="links">
              <i className="fa fa-envelope"></i> Contact
            </Link>
            <Link to="/checkout" className="links">
              <i className="fa fa-credit-card"></i> Checkout
            </Link>
          </div>
        </div>

        <div className="credit">
          <span>&copy; {new Date().getFullYear()} Grocery Store</span> - All Rights Reserved
        </div>
      </section>

      {/* Back to Top Button */}
      <Link to="#" className="back-to-top" onClick={(e) => {
        e.preventDefault()
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }}>
        <i className="fa fa-arrow-up"></i>
      </Link>
    </>
  )
}
