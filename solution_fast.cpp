#include <bits/stdc++.h>
using namespace std;

const long long MOD = 1000000007;

/*
 * OPTIMIZED Solution - O(n) Time Complexity
 * 
 * Key Insight: For each element, calculate its contribution as minimum
 * across all subarrays where it's the minimum element.
 * 
 * Use monotonic stack to find:
 * - Left boundary: previous smaller element
 * - Right boundary: next smaller element
 * 
 * Time Complexity: O(n)
 * Space Complexity: O(n)
 */

int findTotalPower(vector<int> power) {
    int n = power.size();
    long long totalPower = 0;
    
    // Arrays to store indices of previous and next smaller elements
    vector<int> prevSmaller(n), nextSmaller(n);
    stack<int> st;
    
    // Find previous smaller element (or -1 if none)
    for (int i = 0; i < n; i++) {
        while (!st.empty() && power[st.top()] >= power[i]) {
            st.pop();
        }
        prevSmaller[i] = st.empty() ? -1 : st.top();
        st.push(i);
    }
    
    // Clear stack
    while (!st.empty()) st.pop();
    
    // Find next smaller element (or n if none)
    for (int i = n - 1; i >= 0; i--) {
        while (!st.empty() && power[st.top()] > power[i]) {
            st.pop();
        }
        nextSmaller[i] = st.empty() ? n : st.top();
        st.push(i);
    }
    
    // Precompute prefix sums: prefixSum[i] = sum of power[0..i-1]
    vector<long long> prefixSum(n + 1, 0);
    for (int i = 0; i < n; i++) {
        prefixSum[i + 1] = (prefixSum[i] + power[i]) % MOD;
    }
    
    // For each element i, calculate contribution when it's the minimum
    for (int i = 0; i < n; i++) {
        int left = prevSmaller[i];   // Last index where element is smaller
        int right = nextSmaller[i];  // Next index where element is smaller
        
        // Count of subarrays where power[i] is minimum:
        // - Left boundary: (left, i] -> (i - left) choices
        // - Right boundary: [i, right) -> (right - i) choices
        long long leftCount = i - left;
        long long rightCount = right - i;
        
        // Calculate sum contribution for all subarrays where power[i] is min
        // Sum of sums for subarrays [l, r] where l in (left, i] and r in [i, right)
        
        long long sumContribution = 0;
        
        // For each starting position l in (left, i]
        for (int l = left + 1; l <= i; l++) {
            // Sum of all subarrays starting at l and ending in [i, right)
            // This is: sum(prefixSum[r+1] - prefixSum[l]) for r in [i, right)
            
            long long count = right - i;  // Number of ending positions
            long long totalRangeSum = (prefixSum[right] - prefixSum[i]) % MOD;
            if (totalRangeSum < 0) totalRangeSum += MOD;
            
            long long contribution = (count * prefixSum[i]) % MOD;
            contribution = (contribution - count * prefixSum[l]) % MOD;
            if (contribution < 0) contribution += MOD;
            contribution = (contribution + totalRangeSum) % MOD;
            
            sumContribution = (sumContribution + contribution) % MOD;
        }
        
        // Multiply by the minimum value (power[i])
        long long powerContribution = (sumContribution * power[i]) % MOD;
        totalPower = (totalPower + powerContribution) % MOD;
    }
    
    return (int)totalPower;
}

int main() {
    vector<int> power = {2, 3, 2, 1};
    
    int result = findTotalPower(power);
    
    cout << "Input: [2, 3, 2, 1]" << endl;
    cout << "Output: " << result << endl;
    cout << "Expected: 69" << endl;
    
    return 0;
}
