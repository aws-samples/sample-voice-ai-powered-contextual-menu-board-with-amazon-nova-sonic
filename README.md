> [!NOTE]
> The content presented here serves as an example intended solely for educational objectives and should not be implemented in a live production environment without proper modifications and rigorous testing.

# Voice AI powered contextual menu board with Amazon Nova Sonic

## Table of Contents
- 🏛️ [Architecture Overview](#architecture-overview)
- 📋 [Solution Overview](#overview) 
- 🎨 [Studio Features](#studio-features)
- 📦 [Templates](#templates)
- 💰 [Cost](#cost) 
- ✅ [Prerequisites](#prerequisites)
- 🚀 [Deployment Steps](#deployment-steps)
- 🔍 [Deployment Validation](#deployment-validation)
- 📘 [Running the Guidance](#running-the-guidance)
- 🔒 [Security Considerations](#security-considerations)
- 🚀 [Performance Optimization](#performance-optimization)
- ➡️ [Next Steps](#next-steps)
- 🧹 [Cleanup](#cleanup)
- ❓ [FAQ, Known Issues, Additional Considerations, and Limitations](#faq-known-issues-additional-considerations-and-limitations)
- 📝 [Revisions](#revisions)
- ⚠️ [Notices](#notices)
- 👥 [Authors](#authors)
## Architecture Overview

The Voice AI powered contextual menu board implements a comprehensive voice-enabled ordering system using Amazon Nova Sonic Foundation Models:

1. **Frontend Application**: React-based voice chat interface with real-time audio processing
2. **Authentication**: Amazon Cognito manages user authentication and provides temporary AWS credentials
3. **AI Voice Processing**: Amazon Bedrock Nova Sonic handles bidirectional audio streaming for natural conversations
4. **Tool System**: Advanced JavaScript execution environment for dynamic menu management and order processing
5. **Auto-Initiation**: Pre-recorded audio triggers to start conversations automatically
6. **Order Management**: Shopping cart and menu display with real-time pricing and customization

This architecture provides a complete voice-enabled ordering experience with enterprise-grade security and natural voice interactions, adaptable to various business scenarios through customizable templates.

## Solution Overview

This solution demonstrates how to build a production-ready AI-powered voice ordering system using Amazon Nova Foundation Models. The application addresses the need for businesses across hospitality, QSR, and service industries to deploy intelligent voice ordering systems with minimal setup.

**What**: A React-based voice ordering interface that connects directly to Amazon Bedrock Nova Sonic for natural conversation flow, with a built-in Studio for customizing and building templates.

**Who**: Restaurant chains, hotels, coffee shops, delivery services, and developers looking to implement voice AI-powered customer service experiences across various industries.

**Why**: To provide a complete solution for deploying intelligent voice ordering systems that improve customer experience and operational efficiency with low latency and cost-effectively.

The solution leverages Amazon Bedrock's bidirectional streaming capabilities while implementing secure access through Amazon Cognito's User and Identity Pools for credential management.

## Studio Features

The application includes a powerful **Studio** interface that allows developers to build, customize, and manage AI voice ordering experiences without leaving the browser.

### Visual Tool Builder

- **Monaco Editor Integration**: Professional code editor (same as VS Code) for writing JavaScript tools
- **Drag-and-Drop Reordering**: Easily organize tool execution order with visual drag-and-drop
- **Real-time Validation**: Instant feedback on JSON schema and JavaScript syntax errors
- **Syntax Highlighting**: Full code highlighting and IntelliSense support

### Tool Development

Create custom tools that extend the AI's capabilities:

```javascript
// Example: Custom tool for checking inventory
async function execute({...args}) {
  const { input, components, auth, axios, globals } = args;
  
  // Your custom logic here
  const inventory = await checkInventory(input.itemId);
  
  return JSON.stringify({
    success: true,
    available: inventory.quantity > 0,
    quantity: inventory.quantity
  });
}
```

### Configuration Management

- **System Prompt Editor**: Customize AI behavior and conversation flow with Monaco Editor
- **Global Parameters**: Define reusable variables accessible across all tools
- **Component Documentation**: Built-in reference for all available components and methods
- **Auto-Initiation Setup**: Record and configure pre-recorded greeting audio

### Import/Export System

- **Backup & Restore**: Export complete configurations as JSON files
- **Template Sharing**: Share custom templates with your team
- **Version Control**: Keep multiple configuration versions
- **Drag-and-Drop Import**: Simply drag a JSON file to restore settings

### What You Can Build

- Custom menu management systems
- Loyalty program integrations
- Payment processing workflows
- Kitchen display system connections
- Analytics and reporting tools
- Multi-location management
- Custom business logic and validations

## Templates

This solution includes pre-configured templates for different business scenarios. Each template comes with industry-specific tools, prompts, and conversation flows.

### Available Templates

#### 🚗 Drive-Thru Experience
- **Industry**: Quick Service Restaurants (QSR)
- **Complexity**: Intermediate
- **Features**: 
  - Voice ordering with combo detection
  - Upselling and recommendations
  - Loyalty program integration
  - Real-time menu management
- **Setup Time**: ~2 minutes

#### 🏨 Hotel Room Service Concierge
- **Industry**: Hospitality
- **Complexity**: Advanced
- **Features**:
  - Room number validation
  - Guest lookup and personalization
  - Housekeeping and amenity requests
  - Professional hospitality language
  - VIP guest recognition
- **Setup Time**: ~3 minutes

#### ☕ Coffee Shop Barista
- **Industry**: Coffee & Beverages
- **Complexity**: Beginner
- **Features**:
  - Custom drink creation
  - Barista recommendations
  - Seasonal menu support
  - Milk and flavor customizations
- **Setup Time**: ~1 minute

#### 🍕 Pizza Delivery Ordering
- **Industry**: Pizza & Italian
- **Complexity**: Intermediate
- **Features**:
  - Size and crust options
  - Custom topping selection
  - Delivery tracking integration
  - Combo deals and specials
- **Setup Time**: ~2 minutes

### Using Templates

1. **Quick Start Dialog**: On first launch, select a template from the Quick Start dialog
2. **Settings Panel**: Access templates anytime from Settings > Quick Start
3. **One-Click Load**: Templates automatically configure:
   - System prompts
   - Custom tools
   - Menu items
   - Global parameters
   - Company branding

### Creating Custom Templates

Developers can create their own templates for specific business needs:

1. **Build Your Configuration**: Use the Studio to create tools and configure settings
2. **Export Template**: Export your complete configuration as JSON
3. **Package Template**: Create a template folder structure:
   ```
   public/samples/your-template/
   ├── metadata.json      # Template information
   └── settings.json      # Complete configuration
   ```
4. **Register Template**: Add entry to `public/samples/samples-index.json`
5. **Share**: Distribute your template to other locations or teams

**Template Structure Example**:
```json
{
  "id": "your-template",
  "name": "Your Business Template",
  "description": "Custom template for your use case",
  "industry": "Your Industry",
  "complexity": "intermediate",
  "icon": "🎯",
  "features": ["Feature 1", "Feature 2"],
  "estimatedSetupTime": "2 minutes"
}
```

### Key Features

- **🎤 Real-time Voice Interaction**: Natural conversation flow with immediate AI responses
- **🚗 Auto-Initiate Conversations**: Pre-recorded audio allows the application to initiate the conversation automatically
- **🛒 Shopping Cart Integration**: Full order management with pricing, customization, and checkout
- **🧑🏽‍💻 Built-in Studio**: Visual tool builder with Monaco Editor for creating and customizing AI tools
- **📄 Template System**: Pre-built templates for different industries (drive-thru, hotel, coffee shop, pizza delivery)
- **🏢 Editable Company Branding**: Customizable company names and branding throughout the interface
- **🔨 Advanced Tool System**: JavaScript-based tools for menu management, order processing, and integrations
- **💾 Import/Export**: Backup and restore complete configurations including tools and settings
- **📱 Professional UI**: Monaco Editor integration, toast notifications, and responsive design
- **🔐 Security**: AWS Cognito authentication with temporary credential management

### High-Level Steps:

1. Customer initiates interaction and the system auto-starts with a pre-recorded greeting
2. Amazon Nova Sonic processes the customer's voice input in real-time
3. AI responds naturally while executing tools to manage menu display and shopping cart
4. Order details are processed and confirmed through voice interaction
5. Final order is submitted for processing

## Cost

You are responsible for the cost of the AWS services used while running this solution.

As of September 2025, the cost for running this solution with default settings in the US East (N. Virginia) Region is approximately **$12.50** per month for a single location with moderate usage.

We recommend creating a [Budget](https://console.aws.amazon.com/billing/home#/budgets) through [AWS Cost Explorer](https://aws.amazon.com/aws-cost-management/aws-cost-explorer/) to help manage costs. Prices are subject to change. For full details, refer to the pricing webpage for each AWS service used in this solution.

### Sample Cost Table

| AWS Service      | Dimensions                                                                 | Cost (USD)     |
|------------------|-----------------------------------------------------------------------------|----------------|
| Amazon Cognito   | 1,000 active users per month without advanced security features            | $0.00/month    |
| AWS Amplify      | Single location deployment + moderate traffic                               | $5.00/month    |
| Amazon Bedrock   | Nova Sonic voice processing for ~500 orders/month                          | $7.50/month    |

## Prerequisites

**Development Tools**
- Node.js v18.x.x or higher
- Yarn package manager (corepack enabled)
- Modern web browser (Chrome, Firefox, Safari, Edge)

**AWS Account Requirements**
- Access to the following services:
   - Amazon Bedrock (with Nova Sonic model access)
   - Amazon Cognito (for authentication)
   - AWS Amplify (for hosting and deployment)

- [AWS Identity and Access Management (IAM)](https://aws.amazon.com/iam/) permissions to:
   - Use Amazon Bedrock Nova Sonic model
   - Set up Cognito user/identity pools with appropriate policies
   - Deploy Amplify applications

**Important**: Ensure your AWS account has access to Amazon Bedrock Nova Sonic in your target region before starting deployment.

## Deployment Steps

**Objective**: Set up and deploy the QSR AI Drive-Thru Experience application with proper configuration.

### Clone Repository

1. Clone repository to your local machine:

```bash
git clone ssh://git.amazon.com/pkg/QSR-AI-Drive-thru-experience
```

2. Change directory to the folder:
```bash
cd QSR-AI-Drive-thru-experience
```

3. Install dependencies:
```bash
yarn install
```

**Success Criteria**: All dependencies are installed without errors.

### Local Testing Before Deploying

1. Start the development server:

```bash
yarn dev
```

2. Open your browser and navigate to http://localhost:5173
3. Configure your AWS Cognito settings in the application
4. Test the voice interaction and ordering flow

**Success Criteria**: The application runs locally, authentication works, and voice interactions are functional.

### Manual Deployment to AWS Amplify

**Objective**: Deploy the application to AWS Amplify manually.

1. Build the application:

```bash
yarn build
```

2. Package the dist folder contents:

```bash
cd dist
zip -r ../deployment.zip ./*
```

3. Navigate to the **AWS Amplify Console** in your AWS account
4. Click on **Host web app** > **Deploy without Git provider**
5. Upload the deployment.zip file created in step 2
6. Follow the prompts to complete the deployment

**Success Criteria**: The application is successfully deployed and accessible via the Amplify URL.

### Automated Deployment to AWS Amplify

**Objective**: Deploy the application to AWS Amplify using Git integration.

1. Fork or clone this repository to your preferred Git provider

2. Open your [AWS Management console and go to AWS Amplify](https://console.aws.amazon.com/amplify/apps)

3. Connect to your Git repository following AWS Amplify documentation

4. Configure the build settings with the following build specification:
```yml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm i -g corepack
        - corepack enable
    build:
      commands:
        - yarn install
        - yarn build
  artifacts:
    baseDirectory: dist
    files:
      - "**/*"
  cache:
    paths:
      - node_modules/**/*
      - .yarn/cache/**/*
```

5. Click **Next** and then **Save and Deploy**

**Success Criteria**: The application is successfully deployed and accessible via the Amplify URL.

## Set up Amazon Cognito Authentication

**Objective**: Configure Amazon Cognito for secure user authentication.

1. Navigate to the **Amazon Cognito console** in your AWS account
2. Create a new User Pool with the following settings:
   - Sign-in options: Username
   - Password policy: Default or custom as needed
   - MFA: Optional (recommended for production)
3. Create an App Client for the User Pool
4. Create an Identity Pool and link it to your User Pool
5. Configure IAM roles for authenticated users with Bedrock permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeModelWithResponseStream",
        "bedrock:InvokeModel"
      ],
      "Resource": "*"
    }
  ]
}
```

**Success Criteria**: Cognito User Pool and Identity Pool are created with proper IAM permissions for Bedrock access.

## Deployment Validation

**Objective**: Verify that all components are working correctly together.

1. Navigate to your deployed Amplify application URL
2. Configure the application with your Cognito settings
3. Verify that authentication works correctly
4. Test the voice interaction by clicking "Start Streaming"
5. Verify that the AI responds to voice input
6. Test the shopping cart and menu functionality
7. Confirm that auto-initiate conversation works (if configured)

**Success Criteria**:
- Amplify app is successfully deployed and accessible
- Authentication with Cognito works correctly
- Voice streaming connects and processes audio
- AI responds appropriately to voice input
- Shopping cart and menu tools function correctly

## Running the Guidance

**Objective**: Use the deployed application for drive-thru voice ordering.

### Initial Setup

1. Launch the application (locally or via Amplify)
2. Select a template from the Quick Start dialog (or configure manually)
3. Configure your Cognito settings in the Settings panel
4. Authenticate using your Cognito credentials
5. Customize company branding and auto-initiate settings as needed

### Voice Ordering Flow

1. Click "Start Streaming" to begin voice interaction
2. Speak naturally to place orders
3. The AI will respond and update the shopping cart automatically
4. Use voice commands to modify orders, ask questions, or complete checkout
5. Click "Stop Streaming" when the interaction is complete

### Expected Output

- Natural voice conversation with immediate AI responses
- Real-time shopping cart updates based on voice commands
- Professional drive-thru experience with customizable branding
- Secure authentication and temporary credential management

### Debugging and Logging

- Voice processing status is displayed in the interface
- Detailed logs are available in the browser console
- Chat history shows the conversation flow
- Tool execution results are logged for debugging

## Security Considerations

This solution implements several security best practices:

1. **Authentication**: Uses Amazon Cognito for secure user authentication
2. **Temporary Credentials**: Leverages AWS STS for short-lived credentials
3. **No Stored Secrets**: No long-term credentials stored in the frontend
4. **Secure Tool Execution**: JavaScript tools run in controlled execution context
5. **HTTPS**: All communication encrypted in transit

**Additional Security Recommendations**:
- Enable Multi-Factor Authentication (MFA) in Cognito User Pool
- Implement principle of least privilege for IAM roles
- Consider AWS WAF for additional web application protection
- Regular security audits of custom tools and configurations

## Performance Optimization

To optimize performance:

1. **Audio Processing**: Optimized for 16kHz PCM audio with efficient streaming
2. **Tool Execution**: Memoized contexts and efficient re-rendering
3. **Caching**: Client-side caching for menu data and configurations
4. **Monitoring**: CloudWatch integration for performance tracking

## Next Steps

Potential enhancements for production deployment:

1. **Backend Integration**: Implement the Sample Restaurant Backend for order processing
2. **Payment Processing**: Integrate with payment gateways for transaction handling
3. **Kitchen Display**: Connect to kitchen management systems
4. **Analytics**: Implement detailed analytics and reporting
5. **Multi-Location**: Scale to support multiple locations with centralized template management
6. **Advanced AI**: Enhance with additional Nova models for specialized tasks
7. **Custom Templates**: Build industry-specific templates for your business needs
8. **Template Marketplace**: Share and discover templates created by the community

## Cleanup

**Objective**: Remove all resources to avoid ongoing charges.

1. **Delete Amplify App**
   - From AWS Amplify Console, delete the application

2. **Delete Cognito Resources**
   - Remove Identity Pool
   - Remove User Pool and associated app clients

3. **Clean up IAM Resources**
   - Delete custom IAM roles and policies created for the solution

4. **Optional**: Remove any custom CloudWatch logs or metrics

**Success Criteria**: All AWS resources are removed and no longer incurring charges.

## FAQ, Known Issues, Additional Considerations, and Limitations

### Known Issues

- Some browsers may require explicit microphone permissions
- Firefox may require audio resampling adjustments
- Tool execution is limited to client-side JavaScript for security

### Troubleshooting

1. **Voice Not Working**:
   - Check microphone permissions in browser
   - Verify Bedrock Nova Sonic access in your region
   - Check browser console for WebSocket connection errors

2. **Authentication Issues**:
   - Verify Cognito configuration is correct
   - Check IAM role permissions for Bedrock access
   - Confirm Identity Pool is properly linked to User Pool

3. **Tool Execution Errors**:
   - Check browser console for JavaScript errors
   - Verify tool syntax and execution context
   - Review tool input schemas and validation

### Additional Considerations

- Amazon Bedrock charges per token for voice processing
- Consider implementing rate limiting for production
- Tool system allows extensive customization but requires JavaScript knowledge
- Auto-initiate feature requires pre-recorded audio setup
- Templates can be customized and shared across multiple locations
- Studio provides full access to modify all aspects of the AI behavior

### Limitations

- Client-side tool execution only (no server-side processing)
- Limited to supported browsers with modern audio APIs
- Requires stable internet connection for real-time voice processing

For issues or feature requests, please contact the development team.

## Revisions

- **v1.0.0** – Initial release with complete drive-thru experience, voice ordering, and tool system

## Notices

This solution is provided for demonstration and educational purposes. Customers are responsible for making their own independent assessment of the information and code provided.

This solution:
(a) is for informational purposes only,
(b) represents current AWS product offerings and practices, which are subject to change without notice, and
(c) does not create any commitments or assurances from AWS and its affiliates, suppliers, or licensors.

AWS products or services are provided "as is" without warranties, representations, or conditions of any kind, whether express or implied.

## Authors

- Sergio Barraza
- Salman Ahmed
- Ravi Kumar
- Ankush Goyal
