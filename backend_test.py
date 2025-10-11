import requests
import sys
import json
from datetime import datetime

class WarkopMametAPITester:
    def __init__(self, base_url="https://mamet-cafe.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.created_order_id = None
        self.created_menu_item_id = None

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
        
        if headers:
            test_headers.update(headers)

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers, timeout=10)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    if isinstance(response_data, dict) and len(str(response_data)) < 500:
                        print(f"   Response: {response_data}")
                    return True, response_data
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"   Error: {error_data}")
                except:
                    print(f"   Error: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_admin_login(self):
        """Test admin login and get token"""
        print("\n=== TESTING ADMIN AUTHENTICATION ===")
        success, response = self.run_test(
            "Admin Login",
            "POST",
            "auth/login",
            200,
            data={"username": "admin", "password": "admin123"}
        )
        if success and 'token' in response:
            self.token = response['token']
            print(f"   Token obtained: {self.token[:20]}...")
            return True
        return False

    def test_token_verification(self):
        """Test token verification"""
        success, response = self.run_test(
            "Token Verification",
            "GET",
            "auth/verify",
            200
        )
        return success

    def test_menu_operations(self):
        """Test menu CRUD operations"""
        print("\n=== TESTING MENU OPERATIONS ===")
        
        # Get public menu
        success, menu_data = self.run_test(
            "Get Public Menu",
            "GET",
            "menu",
            200
        )
        if not success:
            return False
        
        print(f"   Found {len(menu_data)} menu items")
        
        # Get all menu (admin)
        success, all_menu_data = self.run_test(
            "Get All Menu (Admin)",
            "GET",
            "menu/all",
            200
        )
        if not success:
            return False
        
        # Create new menu item
        new_item = {
            "name": "Test Kopi Susu",
            "category": "drink",
            "price": 15000,
            "image_url": "https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=400",
            "description": "Test kopi susu untuk testing",
            "available": True
        }
        
        success, created_item = self.run_test(
            "Create Menu Item",
            "POST",
            "menu",
            200,
            data=new_item
        )
        if success and 'id' in created_item:
            self.created_menu_item_id = created_item['id']
            print(f"   Created menu item ID: {self.created_menu_item_id}")
        
        # Update menu item
        if self.created_menu_item_id:
            update_data = {
                "name": "Updated Test Kopi Susu",
                "price": 16000
            }
            success, updated_item = self.run_test(
                "Update Menu Item",
                "PUT",
                f"menu/{self.created_menu_item_id}",
                200,
                data=update_data
            )
        
        return True

    def test_order_operations(self):
        """Test order operations"""
        print("\n=== TESTING ORDER OPERATIONS ===")
        
        # Create order
        order_data = {
            "customer_name": "Test Customer",
            "table_number": "Meja 5",
            "items": [
                {
                    "menu_item_id": "test-item-1",
                    "name": "Kopi Hitam",
                    "price": 10000,
                    "quantity": 2
                },
                {
                    "menu_item_id": "test-item-2", 
                    "name": "Nasi Goreng",
                    "price": 15000,
                    "quantity": 1
                }
            ],
            "total": 35000
        }
        
        success, created_order = self.run_test(
            "Create Order",
            "POST",
            "orders",
            200,
            data=order_data
        )
        if success and 'id' in created_order:
            self.created_order_id = created_order['id']
            print(f"   Created order ID: {self.created_order_id}")
        
        # Get specific order
        if self.created_order_id:
            success, order_details = self.run_test(
                "Get Order Details",
                "GET",
                f"orders/{self.created_order_id}",
                200
            )
        
        # Get all orders (admin)
        success, all_orders = self.run_test(
            "Get All Orders (Admin)",
            "GET",
            "orders",
            200
        )
        if success:
            print(f"   Found {len(all_orders)} total orders")
        
        # Update order status
        if self.created_order_id:
            status_update = {"status": "accepted"}
            success, updated_order = self.run_test(
                "Update Order Status",
                "PUT",
                f"orders/{self.created_order_id}/status",
                200,
                data=status_update
            )
        
        return True

    def test_analytics(self):
        """Test analytics endpoint"""
        print("\n=== TESTING ANALYTICS ===")
        
        success, analytics_data = self.run_test(
            "Get Daily Analytics",
            "GET",
            "analytics/daily",
            200
        )
        if success:
            print(f"   Analytics: {analytics_data}")
        
        return success

    def test_qr_code(self):
        """Test QR code generation"""
        print("\n=== TESTING QR CODE ===")
        
        success, qr_data = self.run_test(
            "Generate QR Code",
            "GET",
            "qrcode",
            200
        )
        if success and 'qr_code' in qr_data:
            print(f"   QR Code generated (length: {len(qr_data['qr_code'])})")
        
        return success

    def cleanup(self):
        """Clean up test data"""
        print("\n=== CLEANUP ===")
        
        # Delete created menu item
        if self.created_menu_item_id:
            success, _ = self.run_test(
                "Delete Test Menu Item",
                "DELETE",
                f"menu/{self.created_menu_item_id}",
                200
            )

def main():
    print("🚀 Starting Warkop Mamet API Testing...")
    print("=" * 50)
    
    tester = WarkopMametAPITester()
    
    # Test sequence
    tests = [
        ("Admin Authentication", tester.test_admin_login),
        ("Token Verification", tester.test_token_verification),
        ("Menu Operations", tester.test_menu_operations),
        ("Order Operations", tester.test_order_operations),
        ("Analytics", tester.test_analytics),
        ("QR Code Generation", tester.test_qr_code),
    ]
    
    failed_tests = []
    
    for test_name, test_func in tests:
        try:
            if not test_func():
                failed_tests.append(test_name)
        except Exception as e:
            print(f"❌ {test_name} failed with exception: {str(e)}")
            failed_tests.append(test_name)
    
    # Cleanup
    tester.cleanup()
    
    # Print results
    print("\n" + "=" * 50)
    print("📊 TEST RESULTS")
    print("=" * 50)
    print(f"Tests passed: {tester.tests_passed}/{tester.tests_run}")
    print(f"Success rate: {(tester.tests_passed/tester.tests_run)*100:.1f}%")
    
    if failed_tests:
        print(f"\n❌ Failed test categories: {', '.join(failed_tests)}")
        return 1
    else:
        print("\n✅ All test categories passed!")
        return 0

if __name__ == "__main__":
    sys.exit(main())