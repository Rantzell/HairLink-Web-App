-- ─── REFERRAL SYSTEM SETUP ───────────────────────────────────────
-- Run this in your Supabase SQL Editor

-- 1. Ensure profiles table has necessary columns
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='reward_points') THEN
        ALTER TABLE public.profiles ADD COLUMN reward_points INTEGER DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='referral_code') THEN
        ALTER TABLE public.profiles ADD COLUMN referral_code TEXT UNIQUE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='has_redeemed_code') THEN
        ALTER TABLE public.profiles ADD COLUMN has_redeemed_code BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- 2. Function to generate a random referral code
CREATE OR REPLACE FUNCTION generate_referral_code() RETURNS TEXT AS $$
DECLARE
    new_code TEXT;
    done BOOLEAN := FALSE;
BEGIN
    WHILE NOT done LOOP
        new_code := UPPER(substring(md5(random()::text) from 1 for 6));
        SELECT NOT EXISTS (SELECT 1 FROM public.profiles WHERE referral_code = new_code) INTO done;
    END LOOP;
    RETURN new_code;
END;
$$ LANGUAGE plpgsql;

-- 3. Trigger to assign referral code to new profiles
CREATE OR REPLACE FUNCTION public.handle_new_user_referral() 
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.referral_code IS NULL THEN
        NEW.referral_code := generate_referral_code();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_profile_created_referral ON public.profiles;
CREATE TRIGGER on_profile_created_referral
    BEFORE INSERT ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_referral();

-- 4. Fill missing referral codes for existing users
UPDATE public.profiles SET referral_code = generate_referral_code() WHERE referral_code IS NULL;

-- 5. RPC function to redeem a code
CREATE OR REPLACE FUNCTION public.redeem_referral_code(code_to_redeem TEXT)
RETURNS JSON AS $$
DECLARE
    referrer_id UUID;
    current_uid UUID;
    already_redeemed BOOLEAN;
    cleaned_code TEXT;
BEGIN
    -- Get current authenticated user
    current_uid := auth.uid();
    IF current_uid IS NULL THEN
        RETURN json_build_object('success', false, 'message', 'Authentication required');
    END IF;

    cleaned_code := UPPER(TRIM(code_to_redeem));

    -- Check if user already redeemed a code
    SELECT has_redeemed_code INTO already_redeemed FROM public.profiles WHERE id = current_uid;
    IF already_redeemed THEN
        RETURN json_build_object('success', false, 'message', 'You have already redeemed a referral code.');
    END IF;

    -- Find the referrer (must be a different user)
    SELECT id INTO referrer_id FROM public.profiles 
    WHERE UPPER(referral_code) = cleaned_code 
    AND id != current_uid;

    IF referrer_id IS NULL THEN
        -- Check if it's their own code for a better error message
        IF EXISTS (SELECT 1 FROM public.profiles WHERE id = current_uid AND UPPER(referral_code) = cleaned_code) THEN
            RETURN json_build_object('success', false, 'message', 'You cannot redeem your own referral code.');
        ELSE
            RETURN json_build_object('success', false, 'message', 'Invalid referral code.');
        END IF;
    END IF;

    -- Award points (3 stars for redeemer, 2 stars for referrer)
    UPDATE public.profiles 
    SET reward_points = COALESCE(reward_points, 0) + 3,
        has_redeemed_code = true
    WHERE id = current_uid;

    UPDATE public.profiles 
    SET reward_points = COALESCE(reward_points, 0) + 2
    WHERE id = referrer_id;

    -- 6. Insert notifications for both parties
    INSERT INTO public.notifications (user_id, title, message, type)
    VALUES 
    (current_uid, 'Welcome Gift! 🌟', 'You earned 3 stars for using a referral code. Welcome to the community!', 'donation'),
    (referrer_id, 'Referral Reward! 🎁', 'Someone used your code! You earned 2 bonus stars.', 'donation');

    RETURN json_build_object('success', true, 'message', 'Success! You earned 3 stars.');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
