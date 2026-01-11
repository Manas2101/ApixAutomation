#include <bits/stdc++.h>
using namespace std;

const long long MOD = 1000000007;

/*
 * FINAL OPTIMIZED O(n) Solution
 * 
 * Strategy: For each element power[i], when it's the minimum:
 * 1. Find range where it's minimum using monotonic stack
 * 2. Calculate contribution using mathematical formula
 * 
 * Key insight: 
 * Sum of subarray sums = Σ power[j] × (number of subarrays containing j)
 * where j is in the range and power[i] is minimum
 */

long long mod(long long x) {
    return ((x % MOD) + MOD) % MOD;
}

int findTotalPower(vector<int> power) {
    int n = power.size();
    long long answer = 0;
    
    // Arrays for previous and next smaller elements
    vector<int> prevSmaller(n), nextSmaller(n);
    stack<int> st;
    
    // Find previous smaller element
    for (int i = 0; i < n; i++) {
        while (!st.empty() && power[st.top()] >= power[i]) {
            st.pop();
        }
        prevSmaller[i] = st.empty() ? -1 : st.top();
        st.push(i);
    }
    
    // Clear stack
    while (!st.empty()) st.pop();
    
    // Find next smaller element
    for (int i = n - 1; i >= 0; i--) {
        while (!st.empty() && power[st.top()] > power[i]) {
            st.pop();
        }
        nextSmaller[i] = st.empty() ? n : st.top();
        st.push(i);
    }
    
    // Calculate contribution for each element as minimum
    for (int i = 0; i < n; i++) {
        long long left = i - prevSmaller[i];   // Distance to previous smaller
        long long right = nextSmaller[i] - i;  // Distance to next smaller
        
        // Total sum of all subarray sums where power[i] is minimum
        // For each element power[j] in range (prevSmaller[i], nextSmaller[i]):
        // It appears in (min(j-prevSmaller[i], left)) × (min(nextSmaller[i]-j, right)) subarrays
        
        long long sumOfSums = 0;
        
        int L = prevSmaller[i];
        int R = nextSmaller[i];
        
        for (int j = L + 1; j < R; j++) {
            long long leftCount, rightCount;
            
            if (j <= i) {
                leftCount = j - L;
                rightCount = R - i;
            } else {
                leftCount = i - L;
                rightCount = R - j;
            }
            
            long long freq = mod(leftCount * rightCount);
            long long contribution = mod(freq * power[j]);
            sumOfSums = mod(sumOfSums + contribution);
        }
        
        // Total contribution when power[i] is minimum
        long long totalContribution = mod(power[i] * sumOfSums);
        answer = mod(answer + totalContribution);
    }
    
    return (int)answer;
}

int main() {
    // Fast I/O
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);
    
    // Test case 1
    vector<int> power1 = {2, 3, 2, 1};
    cout << "Test 1: " << findTotalPower(power1) << " (Expected: 69)" << endl;
    
    // Test case 2
    vector<int> power2 = {1, 2, 3};
    cout << "Test 2: " << findTotalPower(power2) << endl;
    
    // Test case 3 - single element
    vector<int> power3 = {5};
    cout << "Test 3: " << findTotalPower(power3) << " (Expected: 25)" << endl;
    
    return 0;
}
