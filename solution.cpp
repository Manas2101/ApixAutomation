#include <bits/stdc++.h>
using namespace std;

const long long MOD = 1000000007;

/*
 * Solution for Amazon Cache Optimization Problem
 * 
 * Problem: Find sum of Power[l,r] for all contiguous groups [l,r]
 * where Power[l,r] = min(power[i]) * sum(power[i]) for i in [l,r]
 * 
 * Approach: Brute force - check all possible contiguous subarrays
 * Time Complexity: O(n^3)
 * Space Complexity: O(1)
 */

int findTotalPower(vector<int> power) {
    int n = power.size();
    long long totalPower = 0;
    
    // Iterate through all possible starting positions
    for (int l = 0; l < n; l++) {
        int minPower = power[l];
        long long sumPower = 0;
        
        // Extend the window to all possible ending positions
        for (int r = l; r < n; r++) {
            // Update minimum and sum for current window [l, r]
            minPower = min(minPower, power[r]);
            sumPower += power[r];
            
            // Calculate Power[l,r] = min * sum
            long long groupPower = ((long long)minPower * sumPower) % MOD;
            
            // Add to total
            totalPower = (totalPower + groupPower) % MOD;
        }
    }
    
    return (int)totalPower;
}

int main() {
    // Test case from the problem
    vector<int> power = {2, 3, 2, 1};
    
    int result = findTotalPower(power);
    
    cout << "Input: [2, 3, 2, 1]" << endl;
    cout << "Output: " << result << endl;
    cout << "Expected: 69" << endl;
    
    // Verify with manual calculation
    cout << "\nBreakdown:" << endl;
    cout << "Power[0,0] = min(2) * sum(2) = 2 * 2 = 4" << endl;
    cout << "Power[0,1] = min(2,3) * sum(2,3) = 2 * 5 = 10" << endl;
    cout << "Power[0,2] = min(2,3,2) * sum(2,3,2) = 2 * 7 = 14" << endl;
    cout << "Power[0,3] = min(2,3,2,1) * sum(2,3,2,1) = 1 * 8 = 8" << endl;
    cout << "Power[1,1] = min(3) * sum(3) = 3 * 3 = 9" << endl;
    cout << "Power[1,2] = min(3,2) * sum(3,2) = 2 * 5 = 10" << endl;
    cout << "Power[1,3] = min(3,2,1) * sum(3,2,1) = 1 * 6 = 6" << endl;
    cout << "Power[2,2] = min(2) * sum(2) = 2 * 2 = 4" << endl;
    cout << "Power[2,3] = min(2,1) * sum(2,1) = 1 * 3 = 3" << endl;
    cout << "Power[3,3] = min(1) * sum(1) = 1 * 1 = 1" << endl;
    cout << "Total: 4+10+14+8+9+10+6+4+3+1 = 69" << endl;
    
    return 0;
}
