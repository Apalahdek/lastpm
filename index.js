// Import required modules
import fetch from 'node-fetch';

// Pinterest image fetcher function
async function pinterest(query) {
  const baseUrl = 'https://www.pinterest.com/resource/BaseSearchResource/get/';
  const queryParams = {
    source_url: '/search/pins/?q=' + encodeURIComponent(query),
    data: JSON.stringify({
      options: {
        isPrefetch: false,
        query,
        scope: 'pins',
        no_fetch_context_on_resource: false
      },
      context: {}
    }),
    _: Date.now()
  };
  const url = new URL(baseUrl);
  Object.entries(queryParams).forEach(entry => url.searchParams.set(entry[0], entry[1]));

  try {
    const json = await (await fetch(url.toString())).json();
    const results = json.resource_response?.data?.results ?? [];
    return results.length > 0 ? results[0].images?.['736x']?.url : ''; // Return the first image URL
  } catch (error) {
    console.error('Error fetching Pinterest data:', error);
    return '';
  }
}

// Helper function to parse Indonesian date strings into JavaScript Date objects
function parseIndonesianDate(dateString) {
  const months = {
    "Januari": "01",
    "Februari": "02",
    "Maret": "03",
    "April": "04",
    "Mei": "05",
    "Juni": "06",
    "Juli": "07",
    "Agustus": "08",
    "September": "09",
    "Oktober": "10",
    "November": "11",
    "Desember": "12"
  };

  // Split the string "Senin, 21/10/2024 16:17 WIB"
  const parts = dateString.replace(" WIB", "").split(" ");
  const [day, date, time] = parts; // e.g., ["Senin,", "21/10/2024", "16:17"]
  const [dayOfMonth, month, year] = date.split("/"); // e.g., ["21", "10", "2024"]

  // Create a JavaScript Date object from the parsed values
  return new Date(`${year}-${month}-${dayOfMonth}T${time}:00`);
}

// Function to fetch and format Gist data
async function fetchGistData() {
  try {
    // GitHub Gist API URL for the specific Gist
    const gistUrl = 'https://api.github.com/gists/a3977acb85a45e07d1af0a84e2f94855';

    // Fetching the Gist data
    const response = await fetch(gistUrl);
    const gist = await response.json();

    // Getting the raw content of the Gist file
    const fileKey = Object.keys(gist.files)[0]; // Assuming there's only one file
    const fileContent = gist.files[fileKey].content;

    // Clean and parse the content to extract relevant info
    const lines = fileContent.split('\n')
      .filter(line => line.includes('|') && !line.includes('---') && !line.includes('Member'));

    // Create an array to store all unique members and lastpm data
    const dataPromises = lines.map(async row => {
      // Split the row by '|' and trim spaces
      const [member, lastpm] = row.split('|').map(item => item.trim()).filter(Boolean);

      // Fetch image from Pinterest for the member
      const image = await pinterest(`${member} jkt48`);

      // Add status only for the member "Adel"
      if (member === "Adel") {
        return { member, lastpm, status: "graduation", image };
      }
      
      // For others, return just member, lastpm, and image
      return { member, lastpm, image };
    });

    // Wait for all the data promises to resolve
    const data = await Promise.all(dataPromises);

    // Remove duplicates by using a Set based on member names
    const uniqueData = Array.from(new Set(data.map(item => item.member)))
      .map(member => data.find(item => item.member === member));

    // Sort by lastpm date (most recent first)
    uniqueData.sort((a, b) => parseIndonesianDate(b.lastpm) - parseIndonesianDate(a.lastpm));

    // Return the sorted data
    return uniqueData;
  } catch (error) {
    console.error('Error fetching Gist data:', error);
    return [];
  }
}

// Vercel Serverless function
export default async function handler(req, res) {
  const data = await fetchGistData();
  res.status(200).json(data);
}
