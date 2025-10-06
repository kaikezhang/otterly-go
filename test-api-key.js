#!/usr/bin/env node

/**
 * Quick API Key Tester
 *
 * Usage: node test-api-key.js YOUR_API_KEY
 * Or set VITE_OPENAI_API_KEY in .env and run: node test-api-key.js
 */

import OpenAI from 'openai';

const apiKey = process.argv[2] || process.env.VITE_OPENAI_API_KEY;

if (!apiKey) {
  console.error('❌ No API key provided');
  console.error('Usage: node test-api-key.js sk-your-key-here');
  console.error('Or set VITE_OPENAI_API_KEY in .env file');
  process.exit(1);
}

console.log('🔍 Testing OpenAI API key...');
console.log(`Key: ${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 4)}`);

const client = new OpenAI({ apiKey });

try {
  const response = await client.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [{ role: 'user', content: 'Say "API key works!"' }],
    max_tokens: 50,
  });

  const text = response.choices[0]?.message?.content || '';

  console.log('✅ API key is valid!');
  console.log(`Response: ${text}`);
  console.log('\nYou can now use this key in OtterlyGo.');
} catch (error) {
  console.error('❌ API key test failed');

  if (error.status === 401) {
    console.error('Error: Invalid API key (401 Unauthorized)');
    console.error('Please check your API key at https://platform.openai.com/api-keys');
  } else if (error.status === 429) {
    console.error('Error: Rate limit exceeded (429)');
    console.error('Please wait a moment and try again, or check your usage limits.');
  } else if (error.code === 'insufficient_quota') {
    console.error('Error: Insufficient quota');
    console.error('Your OpenAI account has no credits. Please add credits at https://platform.openai.com/account/billing');
  } else {
    console.error(`Error: ${error.message}`);
  }

  process.exit(1);
}
