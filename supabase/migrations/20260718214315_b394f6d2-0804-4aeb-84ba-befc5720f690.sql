CREATE POLICY "Users can manage their own google calendar credentials"
ON public.google_calendar_credentials
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());