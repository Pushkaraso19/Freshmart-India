import { Link } from 'react-router-dom'

export default function About(){
  const teamMembers = [
    {
      id: 1,
      name: "Sumedha Wagh",
      role: "Team Leader",
      image: "/assets/image/sumedha.jpg"
    },
    {
      id: 2,
      name: "Vaishnavi Deshmukh",
      role: "Designing & Frontend Developer",
      image: "/assets/image/vaishnavi.jpg"
    },
    {
      id: 3,
      name: "Shreya Gavas",
      role: "Backend Developer & Database Administrator",
      image: "/assets/image/shreya.jpg"
    }
  ];

  return (
    <>
      {/* Combined Home Hero */}
      <section className="hero" id="home">
        <div className="hero-content">
          <div className="hero-text">
            <h1>Fresh & <span>Organic</span> Groceries<br/>Delivered to Your <span>Doorstep</span></h1>
            <p className="hero-description">Experience the finest quality produce sourced directly from farms. We guarantee freshness, quality, and convenience in every order.</p>

            <div className="hero-features">
              <div className="feature-badge">
                <i className="fa fa-truck"></i>
                <span>Free Delivery</span>
              </div>
              <div className="feature-badge">
                <i className="fa fa-clock-o"></i>
                <span>Fresh Daily</span>
              </div>
            </div>

            <div className="hero-actions">
              <Link to="/shopping" className="btn btn-primary btn-large">
                <i className="fa fa-shopping-bag"></i>
                Start Shopping
              </Link>
            </div>
          </div>

          <div className="hero-image">
            <div className="image-container">
              <img src="/assets/image/cat1.png" alt="Fresh Groceries" />
              <div className="floating-card">
                <i className="fa fa-star"></i>
                <div>
                  <h4>Premium Quality</h4>
                  <p>Farm Fresh Guarantee</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* About Us Section */}
      <section className="about-us" id="about-details">
        <div className="container">
          <div className="about-content">
            <div className="about-text">
              <h2>About <span>FreshMart</span></h2>
              <p>
                FreshMart is a college project designed to demonstrate a modern e-commerce platform 
                for grocery shopping. Built with cutting-edge web technologies, this application 
                showcases a complete online shopping experience from product browsing to checkout.
              </p>
              <p>
                This platform features user authentication, cart management, order processing, 
                and an admin dashboard for managing products and orders. It demonstrates the 
                practical application of full-stack development skills.
              </p>
            </div>
          </div>
        </div>
      </section>
    
      {/* Why Choose Us */}
      <section className="why-choose-us" id="features">
        <div className="container">
          <div className="section-header">
            <h2>Key <span>Features</span></h2>
            <p>Modern features for a seamless online grocery shopping experience</p>
          </div>

          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">
                <img src="/assets/image/feature-img-1.png" alt="Fresh Products" />
              </div>
              <div className="feature-content">
                <h3>Product Management</h3>
                <p>Browse through a variety of fresh products with detailed information and images.</p>
                <ul className="feature-list">
                  <li><i className="fa fa-check"></i> Category filtering</li>
                  <li><i className="fa fa-check"></i> Search functionality</li>
                  <li><i className="fa fa-check"></i> Product details</li>
                </ul>
              </div>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <img src="/assets/image/feature-img-2.png" alt="Fast Delivery" />
              </div>
              <div className="feature-content">
                <h3>Cart & Checkout</h3>
                <p>Seamless shopping cart experience with secure checkout process.</p>
                <ul className="feature-list">
                  <li><i className="fa fa-check"></i> Real-time cart updates</li>
                  <li><i className="fa fa-check"></i> Order summary</li>
                  <li><i className="fa fa-check"></i> Order tracking</li>
                </ul>
              </div>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <img src="/assets/image/feature-img-3.png" alt="Admin Panel" />
              </div>
              <div className="feature-content">
                <h3>Admin Dashboard</h3>
                <p>Complete admin panel for managing products, orders, and users.</p>
                <ul className="feature-list">
                  <li><i className="fa fa-check"></i> User management</li>
                  <li><i className="fa fa-check"></i> Order management</li>
                  <li><i className="fa fa-check"></i> Product CRUD operations</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="team" id="team">
        <div className="heading">
          <h1>Our <span>Team</span></h1>
          <p className="subtitle">Students who developed this e-commerce platform</p>
        </div>

        <div className="team-container">
          {teamMembers.map((member) => (
            <div key={member.id} className="team-member">
              <img src={member.image} alt={member.name} />
              <h3>{member.name}</h3>
              <p>{member.role}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  )
}
