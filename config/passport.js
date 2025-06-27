import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { BE_URL, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } from "./env.js";
import User from "../models/user.model.js";

if (
  process.env.NODE_ENV !== "test" &&
  GOOGLE_CLIENT_ID &&
  GOOGLE_CLIENT_SECRET
) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: GOOGLE_CLIENT_ID,
        clientSecret: GOOGLE_CLIENT_SECRET,
        callbackURL: `${BE_URL}/api/v1/auth/google/callback`,
        passReqToCallback: true, // Enable access to request object
      },
      async (req, accessToken, refreshToken, profile, done) => {
        try {
          // Get account type from the state parameter that was passed in googleAuth
          const accountType = req.query.state;

          // First check if user exists with this email
          let user = await User.findOne({ email: profile.emails[0].value });

          if (user) {
            // If user exists, update their googleId if not set
            if (!user.googleId) {
              user.googleId = profile.id;
              await user.save();
            }
            return done(null, user);
          }

          // If no user exists with this email, check if they exist with this googleId
          user = await User.findOne({ googleId: profile.id });

          if (user) {
            return done(null, user);
          }

        // If no user exists, create new user with the account type from state
        user = await User.create({
          name: profile.displayName,
          email: profile.emails[0].value,
          password: Math.random().toString(36).slice(-8), // Generate random password
          accountType: accountType || 'Ứng Viên', // Use state parameter or default to Candidate
          googleId: profile.id,
          isVerified: true, // Google accounts are pre-verified
        });

          return done(null, user);
        } catch (error) {
          return done(error, null);
        }
      }
    )
  );
}

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

export default passport;
