export const toolDescriptions: Record<string, string> = {
  'case-converter': `
    <h3>What is a Case Converter?</h3>
    <p>A case converter is a text transformation tool that changes the capitalization style of your text. Whether you need to convert text to lowercase, UPPERCASE, Title Case, camelCase, snake_case, or kebab-case, our tool handles all common text formatting cases instantly.</p>
    
    <h3>Why Use Case Converter?</h3>
    <p>Text case conversion is essential for developers, content creators, and anyone working with text data. Different programming languages and platforms have different naming conventions. A case converter saves time by automating these transformations, ensuring consistency across your projects, documentation, and code.</p>
    
    <h3>How to Use</h3>
    <p>Simply paste or type your text in the input field and click the Convert button. Your text will instantly be converted to all available case formats, which you can copy with a single click. Perfect for quick transformations without leaving your workflow.</p>
    
    <h3>Available Case Formats</h3>
    <ul>
      <li><strong>lowercase:</strong> converts all text to lowercase letters</li>
      <li><strong>UPPERCASE:</strong> converts all text to UPPERCASE letters</li>
      <li><strong>Title Case:</strong> capitalizes the first letter of each word</li>
      <li><strong>camelCase:</strong> first word lowercase, subsequent words capitalized, no spaces</li>
      <li><strong>PascalCase:</strong> all words capitalized, no spaces (also called UpperCamelCase)</li>
      <li><strong>snake_case:</strong> words separated by underscores, all lowercase</li>
      <li><strong>CONSTANT_CASE:</strong> words separated by underscores, all uppercase</li>
      <li><strong>kebab-case:</strong> words separated by hyphens, all lowercase</li>
    </ul>
    
    <h3>Common Use Cases</h3>
    <ul>
      <li><strong>Code Development:</strong> Convert variable names to camelCase, function names to snake_case, or class names to PascalCase</li>
      <li><strong>Content Creation:</strong> Format headlines and titles with proper title case capitalization</li>
      <li><strong>Data Formatting:</strong> Prepare data for APIs and databases that require specific naming conventions</li>
      <li><strong>SEO Optimization:</strong> Ensure consistent URL slugs and metadata formatting</li>
      <li><strong>Documentation:</strong> Maintain consistent naming conventions throughout technical documentation</li>
    </ul>

    <h3>API Endpoint Use Cases</h3>
    <ul>
      <li><strong>Database Identifier Generation:</strong> Accept user input and convert to snake_case for database field names and identifiers</li>
      <li><strong>Variable Name Validation:</strong> Convert user-provided names to camelCase for programming languages like JavaScript</li>
      <li><strong>Configuration File Processing:</strong> Transform YAML/JSON keys to CONSTANT_CASE for environment variables</li>
      <li><strong>API Parameter Normalization:</strong> Standardize query parameters and headers to consistent naming conventions</li>
      <li><strong>Bulk Content Processing:</strong> Convert large datasets of text titles to Title Case for display across applications</li>
    </ul>
  `,

  'word-counter': `
    <h3>What is a Word Counter?</h3>
    <p>A word counter is a utility tool that analyzes text and provides detailed statistics including word count, character count (with and without spaces), sentence count, and paragraph count. It's an essential tool for writers, students, and content creators.</p>
    
    <h3>Why Use Word Counter?</h3>
    <p>Word counting is crucial for meeting writing requirements, estimating reading time, optimizing content length for SEO, and ensuring your content meets publication standards. Our word counter provides instant, accurate statistics as you type, making it perfect for real-time feedback on your writing.</p>
    
    <h3>How to Use</h3>
    <p>Paste your text into the input area and see instant statistics update automatically. Get a complete breakdown of your content with one paste. Perfect for checking article length, essay requirements, and content optimization.</p>
    
    <h3>Key Features</h3>
    <ul>
      <li><strong>Word Count:</strong> Total number of words in your text</li>
      <li><strong>Character Count:</strong> Total characters including spaces</li>
      <li><strong>Character Count (no spaces):</strong> Total characters excluding spaces</li>
      <li><strong>Sentence Count:</strong> Number of sentences in your text</li>
      <li><strong>Paragraph Count:</strong> Number of paragraphs</li>
      <li><strong>Average Word Length:</strong> Statistical measure of word complexity</li>
      <li><strong>Reading Time:</strong> Estimated time to read the text</li>
    </ul>
    
    <h3>Common Use Cases</h3>
    <ul>
      <li><strong>Academic Writing:</strong> Meet essay and assignment word count requirements</li>
      <li><strong>Content Creation:</strong> Optimize article length for SEO and reader engagement</li>
      <li><strong>Social Media:</strong> Check character counts for platform limits (Twitter, Instagram, etc.)</li>
      <li><strong>Publishing:</strong> Monitor manuscript length and reading time for publications</li>
      <li><strong>Legal Documents:</strong> Verify document length for compliance requirements</li>
    </ul>

    <h3>API Endpoint Use Cases</h3>
    <ul>
      <li><strong>Content Validation:</strong> Check if submitted articles, essays, or posts meet minimum/maximum word count requirements</li>
      <li><strong>Reading Time Estimation:</strong> Calculate estimated reading time for blog posts and articles on your platform</li>
      <li><strong>Form Validation:</strong> Validate user-submitted text in forms to ensure they meet length requirements</li>
      <li><strong>SEO Analysis:</strong> Analyze content length during content creation workflows to optimize for search engines</li>
      <li><strong>Publishing Systems:</strong> Integrate word count checks into CMS platforms to ensure content guidelines compliance</li>
    </ul>
  `,

  'hex-rgba-converter': `
    <h3>What is a Hex/RGBA Converter?</h3>
    <p>A hex and RGBA converter is a color conversion tool that transforms color codes between different formats. Convert between hexadecimal color codes (#FFFFFF), RGB values (rgb(255, 255, 255)), and RGBA with transparency (rgba(255, 255, 255, 1)). Essential for web designers and developers.</p>
    
    <h3>Why Use Hex/RGBA Converter?</h3>
    <p>Different design tools, programming languages, and web platforms use different color formats. Our converter ensures you can work with any color format without manual calculation, saving time and preventing color inconsistencies across your projects.</p>
    
    <h3>How to Use</h3>
    <p>Enter a color value in any format (hex, RGB, or RGBA) and instantly see conversions to all other formats. Copy the converted value with one click and paste it directly into your CSS or design tool.</p>
    
    <h3>Color Formats Explained</h3>
    <ul>
      <li><strong>Hex Color:</strong> Hexadecimal representation using 6 digits after # (e.g., #FF5733) - most common in CSS</li>
      <li><strong>RGB:</strong> Red, Green, Blue values from 0-255 - standard for digital displays</li>
      <li><strong>RGBA:</strong> RGB with Alpha (transparency) channel from 0-1 - enables transparency control</li>
    </ul>
    
    <h3>Common Use Cases</h3>
    <ul>
      <li><strong>Web Design:</strong> Convert between design tool colors and CSS color codes</li>
      <li><strong>CSS Styling:</strong> Convert hex codes to RGBA for transparency effects</li>
      <li><strong>Brand Colors:</strong> Maintain consistent color values across platforms</li>
      <li><strong>Accessibility:</strong> Test color combinations with different alpha values</li>
      <li><strong>Development:</strong> Match designer colors in code exactly</li>
    </ul>

    <h3>API Endpoint Use Cases</h3>
    <ul>
      <li><strong>Design System Automation:</strong> Convert brand colors from Figma (hex) to different formats for code generation</li>
      <li><strong>Theme Generation:</strong> Build dynamic theme systems that accept designer colors in any format</li>
      <li><strong>API Color Responses:</strong> Normalize color data from multiple sources to consistent formats</li>
      <li><strong>Image Processing:</strong> Convert color formats for overlay and blend operations</li>
      <li><strong>Accessibility Tools:</strong> Generate RGBA colors with varying opacity levels programmatically</li>
    </ul>
  `,

  'image-resizer': `
    <h3>What is an Image Resizer?</h3>
    <p>An image resizer is a tool that changes the dimensions of your images while maintaining quality. Resize images for web optimization, social media specifications, thumbnail creation, or any other size requirement without using heavy desktop software.</p>
    
    <h3>Why Resize Images?</h3>
    <p>Image optimization is crucial for website performance, faster loading times, and SEO. Properly sized images reduce bandwidth usage while maintaining visual quality. Different platforms have specific image dimension requirements - social media, email, thumbnails all need different sizes.</p>
    
    <h3>How to Use</h3>
    <p>Upload your image, set your desired dimensions, enable aspect ratio lock if needed, and download your resized image. All processing happens instantly in your browser without uploading to external servers.</p>
    
    <h3>Key Features</h3>
    <ul>
      <li><strong>Custom Dimensions:</strong> Set exact width and height for your images</li>
      <li><strong>Aspect Ratio:</strong> Maintain original proportions while resizing</li>
      <li><strong>Quality Control:</strong> Adjust compression to balance size and quality</li>
      <li><strong>Instant Preview:</strong> See resized results before downloading</li>
      <li><strong>Multiple Formats:</strong> Save in various image formats</li>
    </ul>
    
    <h3>Common Use Cases</h3>
    <ul>
      <li><strong>Website Optimization:</strong> Reduce image file sizes for faster page loads</li>
      <li><strong>Social Media:</strong> Resize for Instagram (1080x1350px), Facebook, Twitter, and LinkedIn requirements</li>
      <li><strong>Email Campaigns:</strong> Optimize images for email without exceeding size limits</li>
      <li><strong>Thumbnails:</strong> Create thumbnail images for galleries and listings</li>
      <li><strong>Mobile Optimization:</strong> Resize high-resolution images for mobile devices</li>
    </ul>

    <h3>API Endpoint Use Cases</h3>
    <ul>
      <li><strong>Bulk Image Processing:</strong> Resize thousands of product images for e-commerce platforms automatically</li>
      <li><strong>Thumbnail Generation:</strong> Create multiple thumbnail sizes from original images for galleries and listings</li>
      <li><strong>CDN Integration:</strong> Optimize images for different devices and screen sizes on the fly</li>
      <li><strong>User Upload Processing:</strong> Automatically resize user-uploaded images to platform specifications</li>
      <li><strong>Responsive Images:</strong> Generate multiple resolutions of images for responsive web design</li>
    </ul>
  `,

  'og-generator': `
    <h3>What is an Open Graph Generator?</h3>
    <p>An Open Graph (OG) generator creates metadata tags that control how your content appears when shared on social media platforms like Facebook, Twitter, LinkedIn, and more. These tags define the title, description, image, and URL that appear in social media previews.</p>
    
    <h3>Why Use OG Generator?</h3>
    <p>Open Graph metadata is essential for social media marketing and content sharing. When someone shares your link, OG tags control how your content is displayed - the preview image, title, and description. Proper OG tags dramatically improve click-through rates and engagement on social platforms.</p>
    
    <h3>How to Use</h3>
    <p>Enter your content details (title, description, image URL, etc.) and our generator creates the HTML meta tags. Copy the generated code and paste it into your page's &lt;head&gt; section. When your content is shared on social media, these tags will control the preview display.</p>

    <h3>OG Tags Explained</h3>
    <ul>
      <li><strong>og:title:</strong> The title of your content as shown in social preview</li>
      <li><strong>og:description:</strong> Summary of your content for the social preview</li>
      <li><strong>og:image:</strong> URL of the image to display in social preview</li>
      <li><strong>og:url:</strong> The canonical URL of your content</li>
      <li><strong>og:type:</strong> Type of content (website, article, video, etc.)</li>
      <li><strong>og:site_name:</strong> Name of your website or brand</li>
    </ul>
    
    <h3>Common Use Cases</h3>
    <ul>
      <li><strong>Blog Articles:</strong> Create engaging previews with custom images and descriptions</li>
      <li><strong>Product Pages:</strong> Showcase products with product images and details in social shares</li>
      <li><strong>Event Promotion:</strong> Display event details prominently when shared on social media</li>
      <li><strong>Video Content:</strong> Specify video thumbnails and details for video shares</li>
      <li><strong>Brand Consistency:</strong> Maintain consistent branding across all social shares</li>
    </ul>

    <h3>API Endpoint Use Cases</h3>
    <ul>
      <li><strong>Dynamic Content Platforms:</strong> Generate OG tags automatically for user-created content, blog posts, and product listings</li>
      <li><strong>Headless CMS Integration:</strong> Generate meta tags from CMS data for any content type on publish</li>
      <li><strong>E-Commerce Optimization:</strong> Create dynamic OG tags for product pages with images, prices, and descriptions</li>
      <li><strong>Content Management Systems:</strong> Automatically generate and update OG tags when content is created or modified</li>
      <li><strong>Social Media Automation:</strong> Batch generate OG tags for scheduled social media posts</li>
    </ul>
  `,

  'blog-generator': `
    <h3>What is an AI Blog Generator?</h3>
    <p>An AI blog generator uses artificial intelligence to create complete blog post outlines and content ideas based on a given topic. Generate blog post structures with multiple writing styles in seconds, perfect for planning content strategy and overcoming writer's block.</p>
    
    <h3>Why Use Blog Generator?</h3>
    <p>Content creation is time-consuming. An AI blog generator accelerates your content planning process by suggesting multiple blog post outlines and styles. Get inspiration for different angles on your topic, from beginner guides to in-depth analysis, helping you create diverse content that reaches different audiences.</p>
    
    <h3>How to Use</h3>
    <p>Enter your blog topic and click Generate. Receive multiple blog post outlines with different styles and approaches. Use these outlines as starting points for your full articles or as inspiration for your content strategy.</p>

    <h3>Writing Styles Provided</h3>
    <ul>
      <li><strong>Beginner's Guide:</strong> Comprehensive introduction for new readers</li>
      <li><strong>In-Depth Analysis:</strong> Detailed exploration with statistics and research</li>
      <li><strong>Quick Tips:</strong> Actionable tips formatted for quick scanning</li>
      <li><strong>Case Study:</strong> Real-world examples and results</li>
      <li><strong>How-To Guide:</strong> Step-by-step instructions and tutorials</li>
      <li><strong>Opinion Piece:</strong> Thought leadership and expert perspective</li>
    </ul>
    
    <h3>Common Use Cases</h3>
    <ul>
      <li><strong>Content Planning:</strong> Generate content calendar ideas and blog outlines</li>
      <li><strong>SEO Strategy:</strong> Create topic-specific content for search ranking</li>
      <li><strong>Writer's Block:</strong> Get inspiration and structure for difficult writing projects</li>
      <li><strong>Content Diversification:</strong> Approach same topic from multiple angles</li>
      <li><strong>Team Collaboration:</strong> Create briefs for content writers and editors</li>
    </ul>

    <h3>API Endpoint Use Cases</h3>
    <ul>
      <li><strong>Content Planning Automation:</strong> Generate multiple blog post ideas and outlines programmatically for editorial calendars</li>
      <li><strong>Headless CMS Integration:</strong> Automatically generate content briefs when users create new blog topics</li>
      <li><strong>Content Marketing Platforms:</strong> Provide AI-generated outlines to writers as starting templates for new articles</li>
      <li><strong>SEO Content Generation:</strong> Generate topic outlines for content clusters and pillar page strategies</li>
      <li><strong>Team Workflow Automation:</strong> Create standardized briefs for content teams to speed up writing processes</li>
    </ul>
  `,

  'json-formatter': `
    <h3>What is a JSON Formatter?</h3>
    <p>A JSON formatter is a developer tool that formats, minifies, and validates JSON data. Beautify messy JSON with proper indentation, minify for performance, or validate your JSON syntax instantly without leaving your browser.</p>
    
    <h3>Why Use JSON Formatter?</h3>
    <p>JSON (JavaScript Object Notation) is the standard data format for APIs and web applications. Properly formatted JSON is readable, maintainable, and debuggable. Our tool helps developers work with JSON faster by formatting, validating, and minifying in one place.</p>
    
    <h3>How to Use</h3>
    <p>Paste your JSON data, choose your action (format, minify, or validate), and instantly see the results. Copy with one click and use in your project immediately.</p>
    
    <h3>Key Features</h3>
    <ul>
      <li><strong>Format:</strong> Pretty-print JSON with proper indentation and line breaks</li>
      <li><strong>Minify:</strong> Compress JSON to smallest size for transmission</li>
      <li><strong>Validate:</strong> Check JSON syntax and catch errors instantly</li>
      <li><strong>Copy Ready:</strong> One-click copy of formatted or minified output</li>
    </ul>
    
    <h3>Common Use Cases</h3>
    <ul>
      <li><strong>API Development:</strong> Test and validate API responses</li>
      <li><strong>Data Processing:</strong> Format data files for analysis</li>
      <li><strong>Configuration Files:</strong> Format and validate config JSON files</li>
      <li><strong>Debugging:</strong> Make complex JSON readable for troubleshooting</li>
      <li><strong>Performance:</strong> Minify JSON for faster transmission and storage</li>
    </ul>

    <h3>API Endpoint Use Cases</h3>
    <ul>
      <li><strong>API Response Validation:</strong> Validate and format API responses to catch errors before processing</li>
      <li><strong>Data Pipeline Processing:</strong> Minify JSON data for transmission and storage in data pipelines</li>
      <li><strong>Configuration Management:</strong> Format and validate configuration files during deployment</li>
      <li><strong>Log Analysis:</strong> Format and parse JSON logs for easier debugging and monitoring</li>
      <li><strong>Data Import/Export:</strong> Validate and format data files for system imports and migrations</li>
    </ul>
  `,

  'base64-converter': `
    <h3>What is a Base64 Converter?</h3>
    <p>A Base64 converter encodes text or data to Base64 format and decodes Base64 strings back to plain text. Base64 is a binary-to-text encoding scheme commonly used in data transmission, email, and web APIs.</p>
    
    <h3>Why Use Base64 Encoding?</h3>
    <p>Base64 encoding is essential for transmitting binary data over text-based systems. It's used in email attachments, data URLs, API authentication, and anywhere binary data needs to be safely transmitted as text. Our converter makes encoding and decoding instant and error-free.</p>
    
    <h3>How to Use</h3>
    <p>Enter your text to encode as Base64, or paste Base64 to decode back to plain text. Get instant conversion with one-click copy for easy integration into your projects.</p>

    <h3>Common Use Cases</h3>
    <ul>
      <li><strong>Data URLs:</strong> Embed images directly in CSS and HTML</li>
      <li><strong>API Authentication:</strong> Encode credentials for Basic Authentication headers</li>
      <li><strong>Email:</strong> Encode binary data for email transmission</li>
      <li><strong>Data Storage:</strong> Store binary data in databases as text</li>
      <li><strong>Cross-Platform:</strong> Share data between systems using safe text format</li>
    </ul>

    <h3>API Endpoint Use Cases</h3>
    <ul>
      <li><strong>File Upload Processing:</strong> Encode file contents to Base64 for transmission through APIs and storage</li>
      <li><strong>API Authentication:</strong> Encode username:password credentials for Basic Auth headers programmatically</li>
      <li><strong>Data URLs Generation:</strong> Convert images and files to Base64 data URLs for embedding in web pages</li>
      <li><strong>Secure Data Transmission:</strong> Encode sensitive data for safe transmission over insecure channels</li>
      <li><strong>Legacy System Integration:</strong> Encode data for compatibility with systems that require Base64 input</li>
    </ul>
  `,

  'url-encoder': `
    <h3>What is a URL Encoder?</h3>
    <p>A URL encoder converts text to URL-safe format and decodes URL-encoded strings. Special characters are converted to percent-encoded characters (e.g., space becomes %20), making text safe for use in URLs and query parameters.</p>
    
    <h3>Why Encode URLs?</h3>
    <p>URLs can only contain certain characters safely. Spaces, special characters, and non-ASCII characters must be encoded for URLs to work properly. URL encoding ensures your URLs are valid and shareable across all platforms.</p>
    
    <h3>How to Use</h3>
    <p>Enter text to encode for use in URLs, or paste URL-encoded text to decode back to plain text. Perfect for quickly preparing data for API requests and dynamic URLs.</p>

    <h3>Common Use Cases</h3>
    <ul>
      <li><strong>Query Parameters:</strong> Encode data for URL search parameters</li>
      <li><strong>Link Building:</strong> Create safe, shareable links with encoded data</li>
      <li><strong>API Requests:</strong> Properly encode parameters for API calls</li>
      <li><strong>Form Data:</strong> Encode form submission data safely</li>
      <li><strong>Dynamic URLs:</strong> Include user input safely in URLs</li>
    </ul>

    <h3>API Endpoint Use Cases</h3>
    <ul>
      <li><strong>Query Parameter Building:</strong> Encode user input for safe inclusion in URL search parameters</li>
      <li><strong>Dynamic Link Generation:</strong> Create shareable links with encoded data for tracking and analytics</li>
      <li><strong>API Request Construction:</strong> Properly encode parameters before sending to third-party APIs</li>
      <li><strong>Search Implementation:</strong> Encode search queries for safe transmission to search endpoints</li>
      <li><strong>Email Link Generation:</strong> Create valid encoded URLs for inclusion in email campaigns</li>
    </ul>
  `,

  'slug-generator': `
    <h3>What is a Slug Generator?</h3>
    <p>A slug generator converts any text into URL-friendly slugs. Remove special characters, convert spaces, and create clean, SEO-friendly URLs from titles, headings, or any text input with customizable separators.</p>
    
    <h3>Why Use Slug Generator?</h3>
    <p>URL slugs are critical for SEO and user experience. Clean, descriptive slugs improve search rankings and make URLs more memorable. A slug generator automates the process of creating perfect slugs from any text, saving time and ensuring consistency.</p>
    
    <h3>How to Use</h3>
    <p>Enter your text, choose your separator preference, and instantly generate a clean, URL-friendly slug. Copy and use in your URLs, database records, or wherever you need clean identifiers.</p>

    <h3>Customization Options</h3>
    <ul>
      <li><strong>Separators:</strong> Choose hyphens (-), underscores (_), or no separator</li>
      <li><strong>Case:</strong> Control lowercase/uppercase conversion</li>
      <li><strong>Length:</strong> Control maximum slug length</li>
      <li><strong>Clean:</strong> Automatically remove special characters and diacritics</li>
    </ul>
    
    <h3>Common Use Cases</h3>
    <ul>
      <li><strong>Blog URLs:</strong> Generate SEO-friendly URLs from blog post titles</li>
      <li><strong>Product Slugs:</strong> Create clean URLs for e-commerce products</li>
      <li><strong>Category URLs:</strong> Generate navigation URL slugs</li>
      <li><strong>API Endpoints:</strong> Create clean identifiers for database records</li>
      <li><strong>Social Media:</strong> Create short, memorable URLs for sharing</li>
    </ul>

    <h3>API Endpoint Use Cases</h3>
    <ul>
      <li><strong>CMS Integration:</strong> Automatically generate URL slugs from article titles when content is created</li>
      <li><strong>E-Commerce Platform:</strong> Create SEO-friendly product URLs from product names automatically</li>
      <li><strong>URL Generation:</strong> Generate clean, consistent slugs for user-generated content and categories</li>
      <li><strong>API Database Records:</strong> Create URL-safe identifiers from user input for database records</li>
      <li><strong>Content Migration:</strong> Bulk generate slugs for content migration between platforms</li>
    </ul>
  `,

  'password-generator': `
    <h3>What is a Password Generator?</h3>
    <p>A password generator creates strong, random passwords tailored to your security requirements. Customize length (4-128 characters), character types (uppercase, lowercase, numbers, symbols), and generate instantly with strength indicators.</p>
    
    <h3>Why Use Password Generator?</h3>
    <p>Strong, unique passwords are essential for account security. A password generator eliminates weak, predictable passwords and ensures you create different passwords for each account. Protecting your accounts with strong passwords prevents unauthorized access and data breaches.</p>
    
    <h3>How to Use</h3>
    <p>Set your password requirements (length and character types), click Generate, and see a strong password instantly. The strength indicator shows your password security level. Copy to clipboard and use immediately or generate again for a different password.</p>

    <h3>Password Strength Indicators</h3>
    <ul>
      <li><strong>Weak:</strong> Short passwords with limited character variety</li>
      <li><strong>Fair:</strong> Moderate length with mixed character types</li>
      <li><strong>Good:</strong> Long passwords with uppercase, lowercase, and numbers</li>
      <li><strong>Strong:</strong> Very long passwords with all character types including symbols</li>
    </ul>
    
    <h3>Customization Options</h3>
    <ul>
      <li><strong>Length:</strong> Set password length from 4 to 128 characters</li>
      <li><strong>Uppercase:</strong> Include A-Z characters</li>
      <li><strong>Lowercase:</strong> Include a-z characters</li>
      <li><strong>Numbers:</strong> Include 0-9 digits</li>
      <li><strong>Symbols:</strong> Include special characters for maximum security</li>
    </ul>
    
    <h3>Common Use Cases</h3>
    <ul>
      <li><strong>Account Creation:</strong> Generate passwords for new accounts</li>
      <li><strong>Security Updates:</strong> Create new strong passwords when updating account security</li>
      <li><strong>Password Manager:</strong> Generate passwords to store in password managers</li>
      <li><strong>API Keys:</strong> Generate secure tokens and API keys</li>
      <li><strong>Application Security:</strong> Create default passwords for applications</li>
    </ul>

    <h3>API Endpoint Use Cases</h3>
    <ul>
      <li><strong>User Account Provisioning:</strong> Generate secure temporary passwords for new user accounts during onboarding</li>
      <li><strong>Password Reset Systems:</strong> Generate one-time reset passwords and send them via email</li>
      <li><strong>API Key Generation:</strong> Create secure API keys and tokens for third-party integrations</li>
      <li><strong>Database Backup Scripts:</strong> Generate strong passwords for database backup tool configurations</li>
      <li><strong>Automated Security:</strong> Generate default credentials for automated deployments and testing environments</li>
    </ul>
  `,
}
