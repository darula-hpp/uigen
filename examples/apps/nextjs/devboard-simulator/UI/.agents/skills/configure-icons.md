# Configure Icons in UIGen

This guide explains how to use professional icon libraries in your UIGen applications.

## Overview

UIGen supports three professional icon libraries that provide scalable, accessible, and customizable icons:

- **Lucide** - Modern, clean icons with consistent design (Recommended)
- **Heroicons** - Beautiful hand-crafted icons by the makers of Tailwind CSS
- **React Icons** - Comprehensive library including Font Awesome, Material Design, and more

## Icon Reference Format

Icons use the format: `library:iconName`

```yaml
icon: "lucide:FileText"
icon: "heroicons:DocumentTextIcon"
icon: "react-icons:FaHome"
```

## Supported Libraries

### 1. Lucide Icons (Recommended)
**Format:** `lucide:IconName`

Lucide provides 1000+ consistent, modern icons perfect for professional applications.

**Popular Icons:**
- `lucide:FileText` - Documents and files
- `lucide:Bot` - AI and automation
- `lucide:PenTool` - Editing and writing
- `lucide:Download` - Downloads
- `lucide:Calendar` - Dates and scheduling
- `lucide:Lock` - Security and privacy
- `lucide:Home` - Home and dashboard
- `lucide:User` - Users and profiles
- `lucide:Settings` - Configuration
- `lucide:Search` - Search functionality
- `lucide:Mail` - Email and messaging
- `lucide:Phone` - Communication
- `lucide:Zap` - Speed and performance
- `lucide:Shield` - Protection and security
- `lucide:Star` - Favorites and ratings
- `lucide:Heart` - Likes and favorites
- `lucide:Bell` - Notifications
- `lucide:BarChart` - Analytics and data
- `lucide:Package` - Products and items
- `lucide:Truck` - Shipping and delivery

**Browse all:** https://lucide.dev/icons/

### 2. Heroicons
**Format:** `heroicons:IconName` (note: add "Icon" suffix)

Heroicons provides beautiful, hand-crafted icons designed for Tailwind CSS projects.

**Popular Icons:**
- `heroicons:DocumentTextIcon` - Documents
- `heroicons:CpuChipIcon` - Technology
- `heroicons:PencilIcon` - Editing
- `heroicons:ArrowDownTrayIcon` - Downloads
- `heroicons:CalendarIcon` - Calendar
- `heroicons:LockClosedIcon` - Security
- `heroicons:HomeIcon` - Home
- `heroicons:UserIcon` - Users
- `heroicons:CogIcon` - Settings
- `heroicons:MagnifyingGlassIcon` - Search

**Browse all:** https://heroicons.com/

### 3. React Icons
**Format:** `react-icons:IconName`

React Icons includes multiple icon families. Use the full icon name with prefix:
- `Fa` prefix = Font Awesome
- `Md` prefix = Material Design
- `Ai` prefix = Ant Design
- `Bs` prefix = Bootstrap
- `Bi` prefix = BoxIcons

**Popular Icons:**
- `react-icons:FaHome` - Home (Font Awesome)
- `react-icons:FaUser` - User (Font Awesome)
- `react-icons:FaCog` - Settings (Font Awesome)
- `react-icons:FaFileAlt` - Document (Font Awesome)
- `react-icons:MdHome` - Home (Material Design)
- `react-icons:MdPerson` - User (Material Design)

**Browse all:** https://react-icons.github.io/react-icons/

## Usage Examples

### Landing Page Features

```yaml
annotations:
  document:
    x-uigen-landing-page:
      sections:
        features:
          items:
            - title: "Smart Templates"
              description: "Upload and manage templates"
              icon: "lucide:FileText"
            
            - title: "AI-Powered"
              description: "Automated generation"
              icon: "lucide:Bot"
            
            - title: "Manual Control"
              description: "Edit content manually"
              icon: "lucide:PenTool"
            
            - title: "Export Options"
              description: "Multiple format support"
              icon: "lucide:Download"
            
            - title: "Organization"
              description: "Track and manage"
              icon: "lucide:Calendar"
            
            - title: "Secure"
              description: "Protected data"
              icon: "lucide:Lock"
```

### App Configuration

```yaml
annotations:
  document:
    x-uigen-app:
      name: "My Application"
      icon: "lucide:Sparkles"
```

### How It Works Steps

```yaml
annotations:
  document:
    x-uigen-landing-page:
      sections:
        howItWorks:
          steps:
            - stepNumber: 1
              title: "Upload"
              description: "Upload your files"
              icon: "lucide:Upload"
            
            - stepNumber: 2
              title: "Process"
              description: "We process your data"
              icon: "lucide:Cpu"
            
            - stepNumber: 3
              title: "Generate"
              description: "Generate results"
              icon: "lucide:Sparkles"
            
            - stepNumber: 4
              title: "Download"
              description: "Get your files"
              icon: "lucide:Download"
```

### Pricing Plans

```yaml
annotations:
  document:
    x-uigen-landing-page:
      sections:
        pricing:
          plans:
            - name: "Free"
              icon: "lucide:Gift"
              price: "$0/month"
            
            - name: "Professional"
              icon: "lucide:Briefcase"
              price: "$29/month"
            
            - name: "Enterprise"
              icon: "lucide:Building"
              price: "Custom"
```

### Testimonials

```yaml
annotations:
  document:
    x-uigen-landing-page:
      sections:
        testimonials:
          items:
            - quote: "Amazing product!"
              author: "John Doe"
              rating: 5
              icon: "lucide:Star"
```

## Icon Categories

### Business & Office
- `lucide:Briefcase` - Business
- `lucide:Building` - Company/Office
- `lucide:Users` - Team
- `lucide:TrendingUp` - Growth
- `lucide:DollarSign` - Finance
- `lucide:PieChart` - Analytics

### Communication
- `lucide:Mail` - Email
- `lucide:MessageSquare` - Chat
- `lucide:Phone` - Call
- `lucide:Video` - Video call
- `lucide:Send` - Send message
- `lucide:Bell` - Notifications

### Files & Documents
- `lucide:File` - Generic file
- `lucide:FileText` - Text document
- `lucide:Folder` - Folder
- `lucide:Upload` - Upload
- `lucide:Download` - Download
- `lucide:Archive` - Archive

### Technology
- `lucide:Cpu` - Processing
- `lucide:Database` - Data storage
- `lucide:Server` - Server
- `lucide:Cloud` - Cloud services
- `lucide:Code` - Development
- `lucide:Terminal` - Command line

### E-commerce
- `lucide:ShoppingCart` - Cart
- `lucide:CreditCard` - Payment
- `lucide:Package` - Product
- `lucide:Truck` - Shipping
- `lucide:Tag` - Price tag
- `lucide:Gift` - Gift/Promotion

### UI Actions
- `lucide:Plus` - Add
- `lucide:Minus` - Remove
- `lucide:X` - Close
- `lucide:Check` - Confirm
- `lucide:Edit` - Edit
- `lucide:Trash` - Delete
- `lucide:Save` - Save
- `lucide:Copy` - Copy
- `lucide:Share` - Share

## Best Practices

1. **Consistency**: Use icons from the same library throughout your application
2. **Meaningful Icons**: Choose icons that clearly represent the feature or action
3. **Accessibility**: Icons automatically include proper aria-labels
4. **Performance**: Icons are lazy-loaded and cached for optimal performance
5. **Fallback**: Invalid icon references automatically show a fallback icon

## Icon Properties

Icons automatically support:
- **Responsive sizing** - Scales with parent container
- **Color inheritance** - Uses current text color
- **Dark mode** - Adapts to theme automatically
- **Hover states** - Interactive feedback
- **Accessibility** - Screen reader support

## Troubleshooting

### Icon Not Displaying

Check these common issues:

1. **Format**: Use `library:iconName` format
2. **Library name**: Must be `lucide`, `heroicons`, or `react-icons`
3. **Icon name**: Case-sensitive, check spelling
4. **Fallback**: Invalid icons show a question mark (HelpCircle)

### Finding Icon Names

**Lucide:**
1. Visit https://lucide.dev/icons/
2. Search for your icon
3. Copy the name exactly as shown
4. Use format: `lucide:IconName`

**Heroicons:**
1. Visit https://heroicons.com/
2. Find your icon
3. Add "Icon" suffix to the name
4. Use format: `heroicons:IconNameIcon`

**React Icons:**
1. Visit https://react-icons.github.io/react-icons/
2. Search for your icon
3. Note the prefix (Fa, Md, etc.)
4. Use format: `react-icons:PrefixIconName`

## Complete Example

```yaml
version: '1.0'
annotations:
  document:
    x-uigen-app:
      name: "Project Manager"
      icon: "lucide:Briefcase"
    
    x-uigen-landing-page:
      enabled: true
      sections:
        hero:
          enabled: true
          headline: "Manage Projects Efficiently"
          icon: "lucide:Rocket"
        
        features:
          enabled: true
          title: "Powerful Features"
          items:
            - title: "Task Management"
              description: "Organize and track tasks"
              icon: "lucide:CheckSquare"
            
            - title: "Team Collaboration"
              description: "Work together seamlessly"
              icon: "lucide:Users"
            
            - title: "Time Tracking"
              description: "Monitor project hours"
              icon: "lucide:Clock"
            
            - title: "Reports & Analytics"
              description: "Insights and metrics"
              icon: "lucide:BarChart"
            
            - title: "File Sharing"
              description: "Share documents easily"
              icon: "lucide:FolderOpen"
            
            - title: "Secure Access"
              description: "Enterprise-grade security"
              icon: "lucide:Shield"
        
        pricing:
          enabled: true
          plans:
            - name: "Starter"
              icon: "lucide:Zap"
              price: "$9/month"
            
            - name: "Business"
              icon: "lucide:Briefcase"
              price: "$29/month"
            
            - name: "Enterprise"
              icon: "lucide:Building"
              price: "Custom"
```

## Additional Resources

- **Lucide Icons**: https://lucide.dev/
- **Heroicons**: https://heroicons.com/
- **React Icons**: https://react-icons.github.io/react-icons/
- **UIGen Documentation**: Check the main docs for more configuration options
