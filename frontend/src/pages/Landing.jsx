import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AddressSearch from "../components/AddressSearch";

function todayDateInput() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}
function nowTimeInput() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

// Reveals a section's children with a fade-up as it scrolls into view.
function useReveal() {
  const ref = useRef(null);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            node.querySelectorAll(".reveal").forEach((el) => el.classList.add("visible"));
            observer.disconnect();
          }
        });
      },
      { threshold: 0.15 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return ref;
}

export default function Landing() {
  const navigate = useNavigate();

  const [heroAddr, setHeroAddr] = useState("");
  const [heroCoords, setHeroCoords] = useState(null);
  const [heroDate, setHeroDate] = useState(todayDateInput());
  const [heroTime, setHeroTime] = useState(nowTimeInput());

  const featuresRef = useReveal();
  const howRef = useReveal();
  const statsRef = useReveal();
  const ctaRef = useReveal();

  function handleHeroSearch(e) {
    e.preventDefault();
    if (heroCoords) {
      navigate("/find", { state: { presetLocation: { ...heroCoords, label: heroAddr } } });
    } else {
      navigate("/find");
    }
  }

  return (
    <div className="landing">
      <section className="landing-hero-v2">
        <div
          className="hero-bg"
          aria-hidden="true"
          style={{
            backgroundImage:
              "url(https://images.unsplash.com/photo-1544111795-fe8b9def73f6?fm=jpg&q=80&w=2400&auto=format&fit=crop)",
          }}
        >
          <div className="hero-bg-gradient" />
        </div>

        <div className="hero-v2-inner">
          <span className="hero-eyebrow fade-up d1">● Built from a real parking demand study</span>
          <h1 className="hero-title fade-up d2">
            Stop circling the block.
            <br />
            <span className="accent">Book your spot before you drive.</span>
          </h1>
          <p className="hero-sub fade-up d3">
            ParkSpot shows every parking lot near you in real time, lets you pick the exact
            spot on the layout, pay by the hour or subscribe monthly, and gets you there with
            turn-by-turn directions.
          </p>

          <form className="hero-search-bar fade-up d4" onSubmit={handleHeroSearch}>
            <div className="hero-search-field hero-search-field-addr">
              <span className="hero-search-icon">📍</span>
              <AddressSearch
                value={heroAddr}
                onChange={setHeroAddr}
                onSelect={(result) => {
                  setHeroAddr(result.label);
                  setHeroCoords({ lat: result.lat, lng: result.lng });
                }}
                placeholder="Find your spot..."
              />
            </div>
            <div className="hero-search-divider" />
            <div className="hero-search-field">
              <span className="hero-search-icon">🗓</span>
              <input type="date" value={heroDate} onChange={(e) => setHeroDate(e.target.value)} />
            </div>
            <div className="hero-search-divider" />
            <div className="hero-search-field">
              <span className="hero-search-icon">🕐</span>
              <input type="time" value={heroTime} onChange={(e) => setHeroTime(e.target.value)} />
            </div>
            <button type="submit" className="btn hero-search-btn">
              Search <span aria-hidden="true">→</span>
            </button>
          </form>

          <div className="hero-checks fade-up d5">
            <span>✓ No Account Needed</span>
            <span>✓ Real-time Availability</span>
          </div>

          <div className="hero-stats fade-up d5">
            <div>
              <div className="hero-stat-num">175%</div>
              <div className="hero-stat-label">avg. lot over-utilization today*</div>
            </div>
            <div>
              <div className="hero-stat-num">8+</div>
              <div className="hero-stat-label">locations studied in the field</div>
            </div>
            <div>
              <div className="hero-stat-num">2 min</div>
              <div className="hero-stat-label">to find & book a spot</div>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <span className="section-eyebrow">Why ParkSpot</span>
          <h2 className="section-title">Parking, the way it should work</h2>
          <p className="section-sub">
            Most apps just point at a neighborhood. We show you the actual layout, the actual
            price, and the actual open spot — updated live as people park and leave.
          </p>
        </div>
        <div className="feature-grid" ref={featuresRef}>
          <div className="feature-card reveal reveal-stagger">
            <div className="feature-icon">◎</div>
            <h3>Real-time availability</h3>
            <p>See exactly how many spots are free at each nearby lot, updated the moment
              someone books or leaves — no more guessing and driving in circles.</p>
          </div>
          <div className="feature-card reveal reveal-stagger">
            <div className="feature-icon">▦</div>
            <h3>Pick your exact spot</h3>
            <p>Every lot is shown as a real layout, spot by spot, so you can choose one that's
              easy to pull into, shaded, or close to the exit.</p>
          </div>
          <div className="feature-card reveal reveal-stagger">
            <div className="feature-icon">↗</div>
            <h3>Directions built in</h3>
            <p>Book a slot and get turn-by-turn driving directions straight to it — distance
              and travel time included.</p>
          </div>
          <div className="feature-card reveal reveal-stagger">
            <div className="feature-icon">₹</div>
            <h3>Pay by the hour or monthly</h3>
            <p>Book a single visit at an hourly rate, or set up a monthly subscription for a
              slot you use every day and skip the daily hassle.</p>
          </div>
          <div className="feature-card reveal reveal-stagger">
            <div className="feature-icon">＋</div>
            <h3>List your own space</h3>
            <p>Have an empty driveway or lot? List it, set your price, and turn unused space
              into income while helping solve local congestion.</p>
          </div>
          <div className="feature-card reveal reveal-stagger">
            <div className="feature-icon">⛱</div>
            <h3>Filter by what matters</h3>
            <p>Search by distance, price, or shade — so you're not left choosing between a
              spot and a sunburned dashboard.</p>
          </div>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="section-head">
          <span className="section-eyebrow">How it works</span>
          <h2 className="section-title">From search to parked in four steps</h2>
        </div>
        <div className="how-list" ref={howRef}>
          <div className="how-step reveal reveal-stagger">
            <span className="how-step-num">01</span>
            <h4>Share your location</h4>
            <p>Or search any address — we'll pull up every lot nearby.</p>
          </div>
          <div className="how-step reveal reveal-stagger">
            <span className="how-step-num">02</span>
            <h4>Compare lots</h4>
            <p>See live availability, price per hour, and shade on a map.</p>
          </div>
          <div className="how-step reveal reveal-stagger">
            <span className="how-step-num">03</span>
            <h4>Pick your spot</h4>
            <p>Choose the exact slot on the layout and your time window.</p>
          </div>
          <div className="how-step reveal reveal-stagger">
            <span className="how-step-num">04</span>
            <h4>Drive there</h4>
            <p>Get directions and park — your spot is held for your time slot.</p>
          </div>
        </div>
      </section>

      <section className="stat-strip">
        <div className="stat-strip-inner" ref={statsRef}>
          <div className="reveal reveal-stagger">
            <h3>146–216%</h3>
            <p>parking utilization range found in surveyed locations</p>
          </div>
          <div className="reveal reveal-stagger">
            <h3>0</h3>
            <p>real-time smart parking systems in place before this</p>
          </div>
          <div className="reveal reveal-stagger">
            <h3>24/7</h3>
            <p>live slot tracking, not just static listings</p>
          </div>
          <div className="reveal reveal-stagger">
            <h3>3 taps</h3>
            <p>to go from open app to booked spot</p>
          </div>
        </div>
      </section>

      <section className="cta-band" ref={ctaRef}>
        <div className="reveal">
          <h2>Your next parking spot is already open somewhere nearby.</h2>
          <p>Find it, book it, and drive straight there — no more circling the block.</p>
          <Link to="/find" className="btn btn-primary btn-lg">
            Find parking near me
          </Link>
        </div>
      </section>
    </div>
  );
}
