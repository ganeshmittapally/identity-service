describe('Authentication E2E Tests', () => {
  beforeEach(() => {
    cy.visit('http://localhost:5173/login');
  });

  it('should display login page', () => {
    cy.get('h1').should('contain', 'Sign In');
    cy.get('input[type="email"]').should('be.visible');
    cy.get('input[type="password"]').should('be.visible');
    cy.get('button').should('contain', 'Sign In');
  });

  it('should navigate to register page', () => {
    cy.contains('Create an account').click();
    cy.url().should('include', '/register');
    cy.get('h1').should('contain', 'Create Account');
  });

  it('should show validation errors on login', () => {
    // Try to login without email
    cy.get('button').click();
    cy.get('.text-red-600').should('contain', 'Email is required');

    // Enter invalid email
    cy.get('input[type="email"]').type('invalid-email');
    cy.get('button').click();
    cy.get('.text-red-600').should('contain', 'Invalid email');
  });

  it('should login successfully with valid credentials', () => {
    cy.get('input[type="email"]').type('test@example.com');
    cy.get('input[type="password"]').type('TestPassword123!');
    cy.get('button').click();

    cy.url().should('include', '/dashboard');
    cy.get('h1').should('contain', 'Dashboard');
  });

  it('should show error on invalid login', () => {
    cy.get('input[type="email"]').type('test@example.com');
    cy.get('input[type="password"]').type('WrongPassword123!');
    cy.get('button').click();

    cy.get('.bg-red-50').should('contain', 'Invalid credentials');
  });
});

describe('Registration E2E Tests', () => {
  beforeEach(() => {
    cy.visit('http://localhost:5173/register');
  });

  it('should display registration form', () => {
    cy.get('h1').should('contain', 'Create Account');
    cy.get('input[type="email"]').should('be.visible');
    cy.get('input[type="password"]').should('be.visible');
  });

  it('should show password strength indicator', () => {
    const password = 'Test';
    cy.get('input[type="password"]').first().type(password);

    // Should show weak password
    cy.get('.bg-red-200').should('be.visible');
    cy.get('h3').should('contain', 'Very Weak');
  });

  it('should validate password requirements', () => {
    cy.get('input[type="password"]').first().type('TestPassword123!');

    // All requirements should be met
    cy.get('.text-green-600').should('have.length.at.least', 5);
  });

  it('should register successfully with valid data', () => {
    const uniqueEmail = `test-${Date.now()}@example.com`;

    cy.get('input[type="email"]').type(uniqueEmail);
    cy.get('input[type="text"]').eq(0).type('John');
    cy.get('input[type="text"]').eq(1).type('Doe');
    cy.get('input[type="password"]').first().type('TestPassword123!');
    cy.get('input[type="password"]').last().type('TestPassword123!');

    // Check terms checkbox
    cy.get('input[type="checkbox"]').check();

    cy.get('button').contains('Create Account').click();

    cy.url().should('include', '/dashboard');
  });

  it('should show error on duplicate email', () => {
    cy.get('input[type="email"]').type('existing@example.com');
    cy.get('input[type="password"]').first().type('TestPassword123!');
    cy.get('input[type="password"]').last().type('TestPassword123!');

    cy.get('button').contains('Create Account').click();

    cy.get('.bg-red-50').should('contain', 'already exists');
  });
});

describe('Dashboard E2E Tests', () => {
  beforeEach(() => {
    cy.login('test@example.com', 'TestPassword123!');
    cy.visit('http://localhost:5173/dashboard');
  });

  it('should display dashboard', () => {
    cy.get('h1').should('contain', 'Dashboard');
    cy.get('.grid').should('be.visible');
  });

  it('should show stat cards', () => {
    cy.contains('OAuth Clients').should('be.visible');
    cy.contains('2FA Status').should('be.visible');
    cy.contains('Account Status').should('be.visible');
  });

  it('should navigate to create client', () => {
    cy.contains('Create OAuth Client').click();
    cy.url().should('include', '/clients');
  });

  it('should show security alert for disabled 2FA', () => {
    cy.get('.bg-yellow-50').should('contain', 'Two-Factor Authentication');
  });

  it('should show recent applications', () => {
    cy.contains('Recent Applications').should('be.visible');
  });
});

describe('OAuth Client Management E2E Tests', () => {
  beforeEach(() => {
    cy.login('test@example.com', 'TestPassword123!');
    cy.visit('http://localhost:5173/clients');
  });

  it('should display clients page', () => {
    cy.get('h1').should('contain', 'OAuth Clients');
    cy.get('button').should('contain', 'Create Client');
  });

  it('should open create client modal', () => {
    cy.contains('Create Client').click();
    cy.get('[role="dialog"]').should('be.visible');
    cy.get('h2').should('contain', 'Create OAuth Client');
  });

  it('should create new client', () => {
    cy.contains('Create Client').click();

    cy.get('input[placeholder*="client"]').type('My Test App');
    cy.get('select').select('web');
    cy.get('textarea').type('http://localhost:3000/callback');

    cy.get('button').contains('Create Client').click();

    cy.get('.bg-blue-50').should('contain', 'My Test App');
  });

  it('should validate redirect URI format', () => {
    cy.contains('Create Client').click();

    cy.get('input[placeholder*="client"]').type('Invalid App');
    cy.get('textarea').type('invalid-url');

    cy.get('button').contains('Create Client').click();

    cy.get('.text-red-600').should('contain', 'Invalid URL');
  });

  it('should show client details', () => {
    cy.get('[role="button"]').first().click();

    cy.get('[role="dialog"]').should('be.visible');
    cy.get('h2').should('contain', 'Client Details');
    cy.contains('Client ID').should('be.visible');
    cy.contains('Redirect URIs').should('be.visible');
  });

  it('should delete client', () => {
    const clientName = 'Client to Delete';

    // Create client
    cy.contains('Create Client').click();
    cy.get('input[placeholder*="client"]').type(clientName);
    cy.get('select').select('web');
    cy.get('textarea').type('http://localhost:3000/callback');
    cy.get('button').contains('Create Client').click();

    // Delete client
    cy.contains(clientName).parent().find('button').last().click();
    cy.get('button').contains('Revoke').click();

    cy.get('.bg-green-50').should('contain', 'deleted');
  });
});

describe('Profile E2E Tests', () => {
  beforeEach(() => {
    cy.login('test@example.com', 'TestPassword123!');
    cy.visit('http://localhost:5173/profile');
  });

  it('should display profile page', () => {
    cy.get('h1').should('contain', 'Profile');
  });

  it('should show user information', () => {
    cy.contains('Account Information').should('be.visible');
    cy.contains('test@example.com').should('be.visible');
  });

  it('should edit profile information', () => {
    cy.get('button').contains('Edit').click();

    cy.get('input[type="text"]').eq(0).clear().type('Updated');
    cy.get('button').contains('Save').click();

    cy.get('.bg-green-50').should('contain', 'Profile updated');
  });

  it('should enable 2FA', () => {
    cy.contains('Enable').click();

    cy.get('[role="dialog"]').should('be.visible');
    cy.get('h2').should('contain', 'Two-Factor Authentication');
    cy.get('img').should('be.visible'); // QR code
  });

  it('should show backup codes', () => {
    // After enabling 2FA
    cy.get('button').contains('View Backup Codes').click();

    cy.get('[role="dialog"]').should('be.visible');
    cy.get('h2').should('contain', 'Backup Codes');
    cy.get('code').should('have.length', 8);
  });
});

describe('Admin Panel E2E Tests', () => {
  beforeEach(() => {
    cy.login('admin@example.com', 'AdminPassword123!');
    cy.visit('http://localhost:5173/admin');
  });

  it('should display admin dashboard', () => {
    cy.get('h1').should('contain', 'Administration');
  });

  it('should show system statistics', () => {
    cy.contains('System Statistics').should('be.visible');
    cy.contains('Total Users').should('be.visible');
    cy.contains('Active (30d)').should('be.visible');
    cy.contains('OAuth Clients').should('be.visible');
    cy.contains('2FA Adoption').should('be.visible');
  });

  it('should search users', () => {
    cy.get('input[placeholder*="Search"]').type('test@example.com');

    cy.contains('test@example.com').should('be.visible');
  });

  it('should view user details', () => {
    cy.get('button[title="View Details"]').first().click();

    cy.get('[role="dialog"]').should('be.visible');
    cy.contains('Full Name').should('be.visible');
    cy.contains('Email').should('be.visible');
  });

  it('should ban/unban user', () => {
    cy.get('button[title="Ban User"]').first().click();

    cy.get('[role="dialog"]').should('be.visible');
    cy.get('button').contains('Ban User').click();

    cy.get('.bg-green-50').should('contain', 'User banned');
  });
});

// Custom commands
Cypress.Commands.add('login', (email: string, password: string) => {
  cy.visit('http://localhost:5173/login');
  cy.get('input[type="email"]').type(email);
  cy.get('input[type="password"]').type(password);
  cy.get('button').contains('Sign In').click();
  cy.url().should('include', '/dashboard');
});
