import { useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'

export default function Contact(){
  const { api } = useAuth()
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  })
  const [category, setCategory] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitMsg, setSubmitMsg] = useState('')
  const [expandedFaq, setExpandedFaq] = useState(null)

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setSubmitMsg('')
    try {
      await api('/contacts', {
        method: 'POST',
        body: {
          name: formData.name,
          email: formData.email,
          subject: formData.subject || null,
          category: category || null,
          message: formData.message
        }
      })
      setSubmitMsg('Message sent successfully! We\'ll get back to you soon.')
      setFormData({ name: '', email: '', subject: '', message: '' })
      setCategory('')
    } catch (err) {
      setSubmitMsg(err.message || 'Failed to send message')
    } finally {
      setSubmitting(false)
    }
  }

  const toggleFaq = (index) => {
    setExpandedFaq(expandedFaq === index ? null : index)
  }

  const faqs = [
    {
      question: "What are your delivery hours?",
      answer: "We deliver from 8:00 AM to 8:00 PM, Monday to Sunday. Same-day delivery is available for orders placed before 6:00 PM."
    },
    {
      question: "What's your return policy?",
      answer: "We offer a 100% satisfaction guarantee. If you're not happy with any product, contact us within 24 hours of delivery for a full refund or replacement."
    },
    {
      question: "Is there a minimum order value?",
      answer: "There's no minimum order value, but free delivery is available on orders above ₹1500. Orders below ₹500 have a 15% of subtotal amount is charged as delivery fee."
    }
  ]

  return (
    <>
      {/* Contact Page Hero */}
      <section className="page-hero" id="contact">
        <div className="content">
          <h1>Contact Us</h1>
          <p>We'd love to hear from you</p>
        </div>
      </section>

      {/* Contact Form Section */}
      <section className="contact-form-section">
        <div className="container">
          <div className="form-content">
            <div className="form-text">
              <h2>Get In <span>Touch</span></h2>
              <p>Fill out the form and we'll get back to you soon.</p>
              
              <div className="contact-cards">
                <div className="contact-card">
                  <div className="contact-icon">
                    <i className="fa fa-phone"></i>
                  </div>
                  <div className="card-content">
                    <h3>Call Us</h3>
                    <p>+91 98765 43210</p>
                  </div>
                </div>

                <div className="contact-card">
                  <div className="contact-icon">
                    <i className="fa fa-envelope"></i>
                  </div>
                  <div className="card-content">
                    <h3>Email Us</h3>
                    <p>support@freshmart.in</p>
                  </div>
                </div>

                <div className="contact-card">
                  <div className="contact-icon">
                    <i className="fa fa-clock-o"></i>
                  </div>
                  <div className="card-content">
                    <h3>Available</h3>
                    <p>24/7 Support</p>
                  </div>
                </div>
              </div>
            </div>

            <form className="contact-form" onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <input 
                    type="text" 
                    name="name"
                    placeholder="Your Name" 
                    value={formData.name}
                    onChange={handleInputChange}
                    required 
                  />
                </div>

                <div className="form-group">
                  <input 
                    type="email" 
                    name="email"
                    placeholder="Your Email" 
                    value={formData.email}
                    onChange={handleInputChange}
                    required 
                  />
                </div>
              </div>

              <div className="form-group">
                <input 
                  type="text" 
                  name="subject"
                  placeholder="Subject" 
                  value={formData.subject}
                  onChange={handleInputChange}
                  required 
                />
              </div>

              <div className="form-group">
                <select name="category" required value={category} onChange={(e)=>setCategory(e.target.value)}>
                  <option value="">Select Category</option>
                  <option value="general">General Inquiry</option>
                  <option value="order">Order Support</option>
                  <option value="delivery">Delivery Issues</option>
                  <option value="quality">Product Quality</option>
                  <option value="billing">Billing Questions</option>
                </select>
              </div>

              <div className="form-group">
                <textarea 
                  name="message"
                  placeholder="Your Message" 
                  rows="5"
                  value={formData.message}
                  onChange={handleInputChange}
                  required
                ></textarea>
              </div>

              <button type="submit" className="btn btn-primary btn-submit" disabled={submitting}>
                {submitting ? (
                  <>
                    <i className="fa fa-spinner fa-spin"></i> Sending...
                  </>
                ) : (
                  <>
                    <i className="fa fa-paper-plane"></i> Send Message
                  </>
                )}
              </button>
              {submitMsg && (
                <div className={`submit-message ${submitMsg.startsWith('Message sent') ? 'success' : 'error'}`}>
                  {submitMsg}
                </div>
              )}
            </form>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="faq" id="faq">
        <div className="container">
          <div className="heading">
            <h1>Frequently Asked <span>Questions</span></h1>
            <p className="subtitle">Quick answers to common questions</p>
          </div>

          <div className="faq-container">
            {faqs.map((faq, index) => (
              <div key={index} className={`faq-item ${expandedFaq === index ? 'active' : ''}`}>
                <div 
                  className="faq-question" 
                  onClick={() => toggleFaq(index)}
                >
                  <h3>{faq.question}</h3>
                  <i className={`fa ${expandedFaq === index ? 'fa-minus' : 'fa-plus'}`}></i>
                </div>
                {expandedFaq === index && (
                  <div className="faq-answer">
                    <p>{faq.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
