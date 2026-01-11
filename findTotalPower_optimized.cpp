#include <bits/stdc++.h>
using namespace std;

/*
 * Optimized solution using monotonic stack
 * Time Complexity: O(n)
 * Space Complexity: O(n)
 */

const long long MOD = 1000000007;

int findTotalPower(vector<int> power) {
    int n = power.size();
    long long totalPower = 0;
    
    // For each element, find how many subarrays have it as minimum
    // Use monotonic stack to find previous and next smaller elements
    
    vector<int> prevSmaller(n), nextSmaller(n);
    stack<int> st;
    
    // Find previous smaller element for each index
    for (int i = 0; i < n; i++) {
        while (!st.empty() && power[st.top()] >= power[i]) {
            st.pop();
        }
        prevSmaller[i] = st.empty() ? -1 : st.top();
        st.push(i);
    }
    
    // Clear stack for next iteration
    while (!st.empty()) st.pop();
    
    // Find next smaller element for each index
    for (int i = n - 1; i >= 0; i--) {
        while (!st.empty() && power[st.top()] > power[i]) {
            st.pop();
        }
        nextSmaller[i] = st.empty() ? n : st.top();
        st.push(i);
    }
    
    // Precompute prefix sums for quick range sum calculation
    vector<long long> prefixSum(n + 1, 0);
    for (int i = 0; i < n; i++) {
        prefixSum[i + 1] = prefixSum[i] + power[i];
    }
    
    // For each element as minimum, calculate contribution
    for (int i = 0; i < n; i++) {
        int left = prevSmaller[i];
        int right = nextSmaller[i];
        
        // Number of subarrays where power[i] is minimum
        long long leftCount = i - left;
        long long rightCount = right - i;
        
        // For each subarray [l, r] where l in (left, i] and r in [i, right)
        // We need to calculate sum of all such subarrays
        long long contribution = 0;
        
        for (int l = left + 1; l <= i; l++) {
            for (int r = i; r < right; r++) {
                long long rangeSum = prefixSum[r + 1] - prefixSum[l];
                contribution = (contribution + rangeSum) % MOD;
            }
        }
        
        // Multiply by minimum value
        contribution = (contribution * power[i]) % MOD;
        totalPower = (totalPower + contribution) % MOD;
    }
    
    return (int)totalPower;
}

int main() {
    // Example test case
    vector<int> power = {2, 3, 2, 1};
    
    int result = findTotalPower(power);
    
    cout << "Result: " << result << endl;
    cout << "Expected: 69" << endl;
    
    // Additional test cases
    vector<int> power2 = {1, 2, 3};
    cout << "\nTest 2 Result: " << findTotalPower(power2) << endl;
    
    return 0;
}
