import { useState } from 'react';

const GEMINI_API_KEYS = [
  'AIzaSyAAk-o1ZQIxHos0ixXdm59qt8jOOEsc_0M',
  'AIzaSyBZcxKcFkMLUBXtYRp5UHoXwGB5mQ1MJVI',
  'AIzaSyDc60zrn69_ofEXMdU4gCOT5QUphrPgiBM',
  'AIzaSyAmh6oy770fHumwmpE7_tyT1cjwiV4jtcA',
  'AIzaSyAIb8_yMe4eBJi0zM-ltIr36VpbIYBrduE',
  'AIzaSyDtYCBEUhsJQoOYtT8AUOHGlicNYyyvdZw',
  'AIzaSyD4C7drU0i3yg9vCx_UyN1kgYaNWnV3K4E',
  'AIzaSyCLaG3KK6BpziM1Uj57Ja9GfnOnqi1o4s8',
  'AIzaSyBHBIe0n4-7tCjfPsRVgNYgUQOznFHfMHw'
];

let currentKeyIndex = 0;

const getNextApiKey = () => {
  const key = GEMINI_API_KEYS[currentKeyIndex];
  currentKeyIndex = (currentKeyIndex + 1) % GEMINI_API_KEYS.length;
  return key;
};

export const useGeminiAPI = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateContent = async (prompt: string, retries = 3): Promise<string> => {
    setLoading(true);
    setError(null);

    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const apiKey = getNextApiKey();
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    {
                      text: prompt
                    }
                  ]
                }
              ],
              generationConfig: {
                temperature: 0.7,
                topK: 40,
                topP: 0.95,
                maxOutputTokens: 8192,
              }
            })
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`API request failed (attempt ${attempt + 1}):`, response.status, errorText);
          
          if (attempt === retries - 1) {
            throw new Error(`API request failed after ${retries} attempts: ${response.status}`);
          }
          
          // Wait before retrying with exponential backoff
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
          continue;
        }

        const data = await response.json();
        const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        
        if (!content.trim()) {
          throw new Error('Empty response from API');
        }
        
        setLoading(false);
        return content;
      } catch (err) {
        console.error(`Error on attempt ${attempt + 1}:`, err);
        
        if (attempt === retries - 1) {
          const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
          setError(errorMessage);
          setLoading(false);
          throw new Error(errorMessage);
        }
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
    
    throw new Error('All retry attempts failed');
  };

  return { generateContent, loading, error };
};