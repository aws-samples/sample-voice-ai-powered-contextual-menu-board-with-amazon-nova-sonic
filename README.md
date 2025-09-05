# QSR AI Drive-Thru Experience with Amazon Nova Foundation Models

## Table of Contents
- 🏛️ [Architecture Overview](#architecture-overview)
- 📋 [Solution Overview](#overview) 
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

The QSR AI Drive-Thru Experience implements a comprehensive voice-enabled ordering system using Amazon Nova Foundation Models:

1. **Frontend Application**: React-based voice chat interface with real-time audio processing
2. **Authentication**: Amazon Cognito manages user authentication and provides temporary AWS credentials
3. **AI Voice Processing**: Amazon Bedrock Nova Sonic handles bidirectional audio streaming for natural conversations
4. **Tool System**: Advanced JavaScript execution environment for dynamic menu management and order processing
5. **Auto-Initiation**: Pre-recorded audio triggers to start conversations automatically
6. **Order Management**: Shopping cart and menu display with real-time pricing and customization

This architecture provides a complete drive-thru experience with enterprise-grade security and natural voice interactions.

## Solution Overview

This solution demonstrates how to build a production-ready AI-powered drive-thru ordering system using Amazon Nova Foundation Models. The application addresses the need for QSR (Quick Service Restaurant) chains to deploy intelligent voice ordering systems with minimal setup.

**What**: A React-based voice ordering interface that connects directly to Amazon Bedrock Nova Sonic for natural conversation flow.

**Who**: QSR operators, restaurant chains, and developers looking to implement AI-powered drive-thru experiences.

**Why**: To provide a complete solution for deploying intelligent voice ordering systems that improve customer experience and operational efficiency.

The solution leverages Amazon Bedrock's bidirectional streaming capabilities while implementing secure access through Amazon Cognito's User and Identity Pools for credential management.

### Key Features

- **🎤 Real-time Voice Interaction**: Natural conversation flow with immediate AI responses
- **🚗 Auto-Initiate Conversations**: Pre-recorded greetings trigger automatically when customers arrive
- **🛒 Shopping Cart Integration**: Full order management with pricing, customization, and checkout
- **🏢 Editable Company Branding**: Customizable company names and branding throughout the interface
- **🔧 Advanced Tool System**: JavaScript-based tools for menu management, order processing, and integrations
- **📱 Professional UI**: Monaco Editor integration, toast notifications, and responsive design
- **🔐 Enterprise Security**: AWS Cognito authentication with temporary credential management

### Demo

*[Demo video or screenshots would go here]*

### High-Level Steps:

1. Customer approaches the drive-thru and the system auto-initiates with a pre-recorded greeting
2. Amazon Nova Sonic processes the customer's voice input in real-time
3. AI responds naturally while executing tools to manage menu display and shopping cart
4. Order details are processed and confirmed through voice interaction
5. Final order is submitted for kitchen preparation and payment processing

## Cost

You are responsible for the cost of the AWS services used while running this solution.

As of September 2025, the cost for running this solution with default settings in the US East (N. Virginia) Region is approximately **$12.50** per month for a single drive-thru location with moderate usage.

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
2. Configure your Cognito settings in the Settings panel
3. Authenticate using your Cognito credentials
4. Configure company branding and auto-initiate settings as needed

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
5. **Multi-Location**: Scale to support multiple restaurant locations
6. **Advanced AI**: Enhance with additional Nova models for specialized tasks

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
