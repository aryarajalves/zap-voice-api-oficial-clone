
    async def get_phone_number_status(self):
        """
        Fetches the phone number quality rating and messaging limit from Meta API.
        """
        wa_phone_id = get_setting("WA_PHONE_NUMBER_ID", "", client_id=self.client_id)
        wa_token = get_setting("WA_ACCESS_TOKEN", "", client_id=self.client_id)
        
        if not wa_phone_id or not wa_token:
            return None
            
        url = f"https://graph.facebook.com/v24.0/{wa_phone_id}"
        params = {
            "fields": "quality_rating,messaging_limit_tier",
            "access_token": wa_token
        }
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(url, params=params)
                if response.status_code == 200:
                    return response.json()
                else:
                    logger.error(f"Error fetching phone status: {response.text}")
                    return None
            except Exception as e:
                logger.error(f"Error in get_phone_number_status: {e}")
                return None
